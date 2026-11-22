// Partidas sin internet entre iPhones cercanos, con Multipeer Connectivity (Bluetooth y wifi directo).
//
// Topología en estrella: el anfitrión anuncia su sala (código y nombre) y acepta a quien pida entrar
// con ese código; cada invitado busca la sala por su código y se conecta solo con el anfitrión.
// Los mensajes son texto (el mismo JSON que en línea) y van por el canal fiable.
import ExpoModulesCore
import MultipeerConnectivity

private let serviceType = "dtactics"

final class NearbyEngine: NSObject, MCSessionDelegate, MCNearbyServiceAdvertiserDelegate, MCNearbyServiceBrowserDelegate {
  private let emit: (String, [String: Any?]) -> Void
  private let me = MCPeerID(displayName: "dt-\(Int.random(in: 100000...999999))")
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?

  private enum Mode { case idle, host(code: String, name: String), guest(code: String), browse }
  private var mode: Mode = .idle
  /** Pares vistos al buscar, por identificador. */
  private var peers: [String: MCPeerID] = [:]
  private var info: [String: [String: String]] = [:]

  init(emit: @escaping (String, [String: Any?]) -> Void) {
    self.emit = emit
  }

  private func key(_ peer: MCPeerID) -> String {
    return "\(peer.displayName)#\(peer.hash)"
  }

  private func newSession() -> MCSession {
    let s = MCSession(peer: me, securityIdentity: nil, encryptionPreference: .required)
    s.delegate = self
    return s
  }

  // MARK: Órdenes desde JavaScript (siempre en el hilo principal)

  func host(code: String, name: String) {
    stop()
    mode = .host(code: code, name: name)
    session = newSession()
    let a = MCNearbyServiceAdvertiser(peer: me, discoveryInfo: ["code": code, "name": String(name.prefix(40))], serviceType: serviceType)
    a.delegate = self
    a.startAdvertisingPeer()
    advertiser = a
  }

  func browse() {
    stop()
    mode = .browse
    startBrowser()
  }

  func join(code: String) {
    stop()
    mode = .guest(code: code)
    session = newSession()
    startBrowser()
  }

  /**
   * Al volver de segundo plano: se reanuda el anuncio o la búsqueda sin tirar las conexiones
   * que sigan vivas. El invitado sin anfitrión vuelve a buscarlo (al encontrarlo, lo invita).
   */
  func restart() {
    switch mode {
    case .idle:
      break
    case .host:
      advertiser?.stopAdvertisingPeer()
      advertiser?.startAdvertisingPeer()
    case .guest:
      if session?.connectedPeers.isEmpty ?? true {
        browser?.stopBrowsingForPeers()
        browser?.startBrowsingForPeers()
      }
    case .browse:
      browser?.stopBrowsingForPeers()
      browser?.startBrowsingForPeers()
    }
  }

  func send(_ text: String) -> Bool {
    guard let s = session, !s.connectedPeers.isEmpty else { return false }
    do {
      try s.send(Data(text.utf8), toPeers: s.connectedPeers, with: .reliable)
      return true
    } catch {
      return false
    }
  }

  func stop() {
    advertiser?.stopAdvertisingPeer()
    advertiser?.delegate = nil
    advertiser = nil
    browser?.stopBrowsingForPeers()
    browser?.delegate = nil
    browser = nil
    session?.disconnect()
    session?.delegate = nil
    session = nil
    peers = [:]
    info = [:]
    mode = .idle
  }

  private func startBrowser() {
    let b = MCNearbyServiceBrowser(peer: me, serviceType: serviceType)
    b.delegate = self
    b.startBrowsingForPeers()
    browser = b
  }

  /** Invitado: pide entrar a la sala del anfitrión que la anuncia. */
  private func invite(_ peer: MCPeerID) {
    guard case let .guest(code) = mode, let s = session, let b = browser else { return }
    if s.connectedPeers.contains(peer) { return }
    b.invitePeer(peer, to: s, withContext: Data(code.utf8), timeout: 20)
  }

  // MARK: Anunciante (anfitrión)

  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
    DispatchQueue.main.async {
      guard case let .host(code, _) = self.mode, let s = self.session,
            let context = context, String(data: context, encoding: .utf8) == code,
            s.connectedPeers.count < 7 else {
        invitationHandler(false, nil)
        return
      }
      invitationHandler(true, s)
    }
  }

  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
    emit("onError", ["message": error.localizedDescription])
  }

  // MARK: Buscador

  func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo discoveryInfo: [String: String]?) {
    DispatchQueue.main.async {
      guard let found = discoveryInfo, let code = found["code"] else { return }
      let id = self.key(peerID)
      self.peers[id] = peerID
      self.info[id] = found
      self.emit("onFound", ["id": id, "code": code, "name": found["name"] ?? ""])
      if case let .guest(target) = self.mode, target == code { self.invite(peerID) }
    }
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    DispatchQueue.main.async {
      let id = self.key(peerID)
      self.peers[id] = nil
      self.info[id] = nil
      self.emit("onLost", ["id": id])
    }
  }

  func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
    emit("onError", ["message": error.localizedDescription])
  }

  // MARK: Sesión

  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    DispatchQueue.main.async {
      guard session === self.session else { return }
      let id = self.key(peerID)
      let name = state == .connected ? "connected" : state == .connecting ? "connecting" : "disconnected"
      self.emit("onPeer", ["id": id, "state": name, "count": session.connectedPeers.count])
      // El invitado que pierde al anfitrión lo vuelve a intentar mientras siga a la vista.
      if state == .notConnected, case let .guest(code) = self.mode, self.info[id]?["code"] == code {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
          guard let self = self, let peer = self.peers[id] else { return }
          self.invite(peer)
        }
      }
    }
  }

  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    let text = String(decoding: data, as: UTF8.self)
    DispatchQueue.main.async {
      guard session === self.session else { return }
      self.emit("onMessage", ["id": self.key(peerID), "data": text])
    }
  }

  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

public class DerbyNearbyModule: Module {
  private var engine: NearbyEngine?

  private func get() -> NearbyEngine {
    if let e = engine { return e }
    let e = NearbyEngine { [weak self] name, body in
      self?.sendEvent(name, body)
    }
    engine = e
    return e
  }

  public func definition() -> ModuleDefinition {
    Name("DerbyNearby")

    Events("onFound", "onLost", "onPeer", "onMessage", "onError")

    AsyncFunction("host") { (code: String, name: String) in
      self.get().host(code: code, name: name)
    }.runOnQueue(.main)

    AsyncFunction("browse") {
      self.get().browse()
    }.runOnQueue(.main)

    AsyncFunction("join") { (code: String) in
      self.get().join(code: code)
    }.runOnQueue(.main)

    AsyncFunction("restart") {
      self.get().restart()
    }.runOnQueue(.main)

    AsyncFunction("send") { (text: String) -> Bool in
      return self.get().send(text)
    }.runOnQueue(.main)

    AsyncFunction("stop") {
      self.engine?.stop()
    }.runOnQueue(.main)

    OnDestroy {
      let e = self.engine
      DispatchQueue.main.async { e?.stop() }
    }
  }
}
