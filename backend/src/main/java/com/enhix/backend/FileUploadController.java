package com.enhix.backend;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") 
public class FileUploadController {

    private final String UPLOAD_DIR = "uploads/";

    public FileUploadController() {
        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadFile(@RequestParam("media") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new UploadResponse(false, "No file uploaded.", null, null));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            String baseName = "media";

            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                baseName = originalFilename.substring(0, originalFilename.lastIndexOf("."));
            }

            
            String newFilename = baseName + "-" + System.currentTimeMillis() + extension;
            Path path = Paths.get(UPLOAD_DIR + newFilename);

            
            Files.write(path, file.getBytes());

            String contentType = file.getContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");
            boolean isVideo = contentType != null && contentType.startsWith("video/");

            String message = "File uploaded successfully.";
            if (isImage) {
                message = "Image uploaded successfully. Continue to tools below.";
            } else if (isVideo) {
                message = "Video uploaded successfully. Continue to tools below.";
            }

            String type = isImage ? "image" : (isVideo ? "video" : "other");

            return ResponseEntity.ok(new UploadResponse(true, message, newFilename, type));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new UploadResponse(false, "Upload failed: " + e.getMessage(), null, null));
        }
    }

    @GetMapping("/files")
    public ResponseEntity<List<String>> getFiles() {
        File folder = new File(UPLOAD_DIR);
        File[] listOfFiles = folder.listFiles();
        List<String> fileNames = new ArrayList<>();

        if (listOfFiles != null) {
            fileNames = Arrays.stream(listOfFiles)
                    .filter(File::isFile)
                    .map(File::getName)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(fileNames);
    }

    @DeleteMapping("/files/{filename}")
    public ResponseEntity<String> deleteFile(@PathVariable String filename) {
        try {
            Path file = Paths.get(UPLOAD_DIR + filename);
            boolean deleted = Files.deleteIfExists(file);
            if (deleted) {
                return ResponseEntity.ok("File deleted successfully.");
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found.");
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not delete file: " + e.getMessage());
        }
    }
}
