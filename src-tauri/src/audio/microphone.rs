use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};

pub struct MicRecorder {
    samples: Arc<Mutex<Vec<f32>>>,
    running: Arc<AtomicBool>,
    sample_rate: u32,
    channels: u16,
    stream: Option<cpal::Stream>,
}

impl MicRecorder {
    pub fn new() -> Self {
        Self {
            samples: Arc::new(Mutex::new(Vec::new())),
            running: Arc::new(AtomicBool::new(false)),
            sample_rate: 16000,
            channels: 1,
            stream: None,
        }
    }

    pub fn start(&mut self, device_name: Option<&str>) -> Result<(), String> {
        let host = cpal::default_host();

        let device = if let Some(name) = device_name {
            host.input_devices()
                .map_err(|e| format!("Failed to list devices: {}", e))?
                .find(|d| d.name().map(|n| n == name).unwrap_or(false))
                .ok_or_else(|| format!("Device not found: {}", name))?
        } else {
            host.default_input_device()
                .ok_or_else(|| "No default input device".to_string())?
        };

        let config = device.default_input_config()
            .map_err(|e| format!("Failed to get config: {}", e))?;

        self.sample_rate = config.sample_rate().0;
        self.channels = config.channels();
        self.running.store(true, Ordering::SeqCst);

        let samples = self.samples.clone();
        let running = self.running.clone();

        // Clear previous samples
        samples.lock().unwrap().clear();

        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if running.load(Ordering::SeqCst) {
                            samples.lock().unwrap().extend_from_slice(data);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None,
                ).map_err(|e| format!("Failed to build stream: {}", e))?
            }
            cpal::SampleFormat::I16 => {
                let samples = self.samples.clone();
                let running = self.running.clone();
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if running.load(Ordering::SeqCst) {
                            let floats: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            samples.lock().unwrap().extend_from_slice(&floats);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None,
                ).map_err(|e| format!("Failed to build stream: {}", e))?
            }
            cpal::SampleFormat::U16 => {
                let samples = self.samples.clone();
                let running = self.running.clone();
                device.build_input_stream(
                    &config.into(),
                    move |data: &[u16], _: &cpal::InputCallbackInfo| {
                        if running.load(Ordering::SeqCst) {
                            let floats: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                            samples.lock().unwrap().extend_from_slice(&floats);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None,
                ).map_err(|e| format!("Failed to build stream: {}", e))?
            }
            _ => return Err("Unsupported sample format".to_string()),
        };

        stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
        self.stream = Some(stream);

        log::info!("Mic recording started: {}Hz, {} channels", self.sample_rate, self.channels);
        Ok(())
    }

    pub fn stop(&mut self) -> (Vec<f32>, u32, u16) {
        self.running.store(false, Ordering::SeqCst);
        self.stream = None;

        let samples = std::mem::take(&mut *self.samples.lock().unwrap());
        log::info!("Mic recording stopped: {} samples", samples.len());
        (samples, self.sample_rate, self.channels)
    }

    pub fn get_level(&self) -> f32 {
        calculate_level(&self.samples, self.sample_rate, self.channels)
    }

    pub fn samples_arc(&self) -> Arc<Mutex<Vec<f32>>> {
        self.samples.clone()
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u16 {
        self.channels
    }
}

/// Calculate RMS audio level from last ~50ms of samples.
/// Callable from any thread with a shared samples buffer.
pub fn calculate_level(samples: &Arc<Mutex<Vec<f32>>>, sample_rate: u32, channels: u16) -> f32 {
    let samples = samples.lock().unwrap();
    if samples.is_empty() {
        return 0.0;
    }
    let window = (sample_rate as usize * channels as usize) / 20; // 50ms
    let start = samples.len().saturating_sub(window);
    let slice = &samples[start..];
    let rms = (slice.iter().map(|s| s * s).sum::<f32>() / slice.len() as f32).sqrt();
    (rms * 5.0).min(1.0) // amplify and clamp
}

pub fn list_input_devices() -> Result<Vec<(String, bool)>, String> {
    let host = cpal::default_host();
    let default = host.default_input_device().and_then(|d| d.name().ok());

    let devices = host.input_devices()
        .map_err(|e| format!("Failed to list devices: {}", e))?;

    let mut result = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            let is_default = default.as_ref().map(|d| d == &name).unwrap_or(false);
            result.push((name, is_default));
        }
    }
    Ok(result)
}
