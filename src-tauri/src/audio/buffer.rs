/// A ring buffer for continuous audio capture (used for loopback/desktop audio)
pub struct RingBuffer {
    data: Vec<f32>,
    capacity: usize,
    write_pos: usize,
    filled: bool,
}

impl RingBuffer {
    pub fn new(duration_secs: usize, sample_rate: u32, channels: u16) -> Self {
        let capacity = duration_secs * sample_rate as usize * channels as usize;
        Self {
            data: vec![0.0; capacity],
            capacity,
            write_pos: 0,
            filled: false,
        }
    }

    pub fn write(&mut self, samples: &[f32]) {
        for &sample in samples {
            self.data[self.write_pos] = sample;
            self.write_pos += 1;
            if self.write_pos >= self.capacity {
                self.write_pos = 0;
                self.filled = true;
            }
        }
    }

    /// Read the last `duration_secs` of audio from the buffer
    pub fn read_last(&self, duration_secs: usize, sample_rate: u32, channels: u16) -> Vec<f32> {
        let requested = duration_secs * sample_rate as usize * channels as usize;
        let available = if self.filled { self.capacity } else { self.write_pos };
        let to_read = requested.min(available);

        if to_read == 0 {
            return Vec::new();
        }

        let mut result = Vec::with_capacity(to_read);

        if self.filled {
            let start = if self.write_pos >= to_read {
                self.write_pos - to_read
            } else {
                self.capacity - (to_read - self.write_pos)
            };

            if start < self.write_pos {
                result.extend_from_slice(&self.data[start..self.write_pos]);
            } else {
                result.extend_from_slice(&self.data[start..]);
                result.extend_from_slice(&self.data[..self.write_pos]);
            }
        } else {
            let start = self.write_pos.saturating_sub(to_read);
            result.extend_from_slice(&self.data[start..self.write_pos]);
        }

        result
    }

    pub fn clear(&mut self) {
        self.write_pos = 0;
        self.filled = false;
    }
}
