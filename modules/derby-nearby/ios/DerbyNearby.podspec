Pod::Spec.new do |s|
  s.name           = 'DerbyNearby'
  s.version        = '1.0.0'
  s.summary        = 'Partidas sin internet entre iPhones cercanos (Multipeer Connectivity).'
  s.description    = 'Partidas sin internet entre iPhones cercanos (Multipeer Connectivity).'
  s.license        = 'UNLICENSED'
  s.author         = 'DerbyTactics'
  s.homepage       = 'https://derbytactics.github.io/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MultipeerConnectivity'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
