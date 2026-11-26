/**
 * Textos legales del juego. Son un punto de partida, no asesoramiento jurídico:
 * antes de publicar hay que rellenar los datos del titular y hacer que los revise alguien cualificado.
 */
export const LEGAL = {
  /** Nombre y apellidos o razón social del responsable. Vacío = pendiente. */
  owner: 'Juan Ramón Fernández Calvo',
  /** Correo de contacto para ejercer derechos. Vacío = pendiente. */
  contact: 'juanra.fernandez@gmail.com',
  updated: '20 de noviembre de 2026',
};

export const legalReady = () => LEGAL.owner.trim() !== '' && LEGAL.contact.trim() !== '';
const owner = () => LEGAL.owner || '[pendiente: nombre del titular]';
const contact = () => LEGAL.contact || '[pendiente: correo de contacto]';

export interface LegalSection {
  title: string;
  body: string[];
}

export const privacy = (): LegalSection[] => [
  { title: 'Quién es el responsable', body: [`El responsable del tratamiento de tus datos es ${owner()}. Puedes escribir a ${contact()} para cualquier cuestión sobre privacidad.`] },
  {
    title: 'Qué datos se guardan',
    body: [
      'Si juegas como invitado no se te pide ningún dato personal. En tu dispositivo se guardan el avatar elegido, un identificador aleatorio del dispositivo para recuperar tu asiento en una sala, el nombre y el escudo de tu club, el historial de tus temporadas terminadas, tus resultados del reto diario, tu carrera, tus logros y tu álbum de futbolistas y, si la hay, la partida en curso.',
      'Si creas una cuenta se guardan además tu correo electrónico, tu nombre de usuario, tu avatar, el nombre y el escudo de tu club, el historial de tus temporadas terminadas (resultado y clasificación), tus resultados del reto diario, tus logros y tu álbum de futbolistas, las partidas en línea que juegas con su resultado, tus victorias, y las valoraciones que das y recibes como anfitrión.',
      'Se entra con Google o con Apple, sin contraseña: ese servicio confirma quién eres y nos envía tu correo. Google envía también tu nombre y tu foto, y el sistema de cuentas los conserva junto a tu acceso, pero el juego no los muestra ni los usa: eliges un nombre de usuario propio. Apple puede darnos un correo anónimo de reenvío en lugar del tuyo, si así lo eliges.',
      'Si con tu cuenta entras en una sala en línea y aceptas los avisos, se guarda el identificador de avisos de tu móvil para avisarte de que te toca. Se borra al cerrar sesión en ese móvil.',
      'Si denuncias el nombre de otro jugador, o alguien denuncia el tuyo, se guarda quién denuncia, a quién y qué nombre, para retirar los nombres ofensivos.',
      'Para saber qué mejorar se envían datos de uso anónimos: cuándo empieza, termina o se abandona una partida, el modo, el número de clubes, el nivel de la IA, la liga, la jornada, el puesto final y el sistema (iPhone, Android o web). No llevan tu cuenta ni ningún identificador de tu dispositivo.',
      'Si la aplicación falla, puede enviarse un informe técnico con el mensaje de error, sin datos personales más allá de tu identificador de cuenta si has iniciado sesión.',
    ],
  },
  { title: 'Para qué se usan', body: ['Para que puedas entrar con tu cuenta, crear salas, consultar tu historial y aparecer en el ranking, y para mantener el juego funcionando y corregir errores. No se usan para publicidad ni se venden a nadie.'] },
  {
    title: 'Quién más interviene',
    body: [
      'Las cuentas y las partidas guardadas se alojan en Supabase. La web se sirve desde GitHub Pages. Google o Apple, según con cuál entres, intervienen en el acceso según sus propias políticas de privacidad. Los avisos «Te toca» se envían a través del servicio de notificaciones de Expo (650 Industries) y de Apple o Google; solo llevan el texto del aviso y el código de la sala.',
      'Durante una partida en línea, el estado de la sala (nombres de club, plantillas y cartas) viaja por el servicio de mensajería de Supabase (o, si no responde, por servidores públicos de mensajería). No incluye tu correo, pero no debe considerarse privado.',
    ],
  },
  { title: 'Cuánto tiempo se conservan', body: ['Mientras mantengas tu cuenta. Puedes borrarla en cualquier momento desde «Mi cuenta → Borrar mi cuenta»: se eliminan tu perfil, tu club, tu historial y tus valoraciones.'] },
  {
    title: 'Tus derechos',
    body: [`Puedes pedir acceso, rectificación, supresión, limitación, oposición y portabilidad de tus datos escribiendo a ${contact()}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`],
  },
  { title: 'Menores', body: ['El juego no está dirigido a menores de 14 años. Si eres menor de esa edad, no crees una cuenta sin el permiso de tus padres o tutores.'] },
];

export const terms = (): LegalSection[] => [
  { title: 'Qué es DerbyTactics', body: [`DerbyTactics es un juego de cartas de fútbol ofrecido por ${owner()}. Los futbolistas y clubes que aparecen son ficticios; cualquier parecido con personas o entidades reales es casual.`] },
  { title: 'Tu cuenta', body: ['Eres responsable de lo que se haga con tu cuenta y de proteger el acceso a tu cuenta de Google o Apple. Elige un nombre de usuario y un nombre de club que no sean ofensivos ni suplanten a nadie. Los nombres ofensivos se rechazan o se retiran, y el anfitrión de una sala puede expulsar a quien quiera de la sala de espera.'] },
  {
    title: 'Juego limpio',
    body: [
      'No está permitido hacer trampas, manipular resultados, abandonar partidas a propósito para perjudicar a otros ni usar el juego para acosar o insultar.',
      'Quien crea una sala es su anfitrión. Abandonar partidas de forma repetida o recibir malas valoraciones puede impedir crear salas durante un tiempo, como se explica en el juego.',
    ],
  },
  { title: 'Sin dinero real', body: ['Los millones del juego son ficticios. No se pueden comprar, vender ni canjear por dinero ni por nada con valor real.'] },
  { title: 'Disponibilidad', body: ['El juego se ofrece tal cual. Puede haber interrupciones, errores o cambios en las reglas, y las partidas en línea dependen de servicios de terceros que pueden fallar. No se garantiza la conservación del historial ni del ranking.'] },
  { title: 'Cambios y cierre de cuentas', body: ['Estas condiciones pueden actualizarse; la fecha de la última versión aparece arriba. Las cuentas que incumplan estas normas pueden ser suspendidas o eliminadas.'] },
  { title: 'Contacto', body: [`Para cualquier duda, escribe a ${contact()}.`] },
];
