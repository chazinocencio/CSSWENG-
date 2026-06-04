Pod::Spec.new do |s|
  s.name           = 'NativeDicom'
  s.version        = '1.0.0'
  s.summary        = 'Native DICOM module with shared C++'
  s.description    = 'Native DICOM module with shared C++ for DICOM parsing and processing'
  s.author         = 'Your Name'
  s.homepage       = 'https://github.com/your-repo'
  s.platforms      = { :ios => '13.4' }
  s.source         = { :git => 'https://github.com/your-repo.git', :tag => s.version.to_s }
  s.source_files   = '**/*.{h,m,mm,swift}', '../cpp/**/*.{h,cpp}'
  s.preserve_paths = '../cpp/**/*.{h,cpp}'
  s.header_dir     = 'NativeDicom'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/../cpp"'
  }
end
