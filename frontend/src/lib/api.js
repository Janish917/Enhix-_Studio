export function uploadToBackend(blob, filename, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('media', blob, filename);

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `Upload failed (Status ${xhr.status})`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error or connection lost.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted.'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

export async function getFiles() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('Failed to fetch files');
    return await res.json();
  } catch (error) {
    throw new Error('Failed to connect to API: ' + error.message);
  }
}

export async function deleteFile(filename) {
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to delete file');
    }
    return await res.text();
  } catch (error) {
    throw new Error('Failed to connect to API: ' + error.message);
  }
}
