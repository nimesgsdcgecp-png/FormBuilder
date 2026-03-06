package com.sttl.formbuilder2.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * FileUploadController — REST Controller for File Upload and Serving
 *
 * What it does:
 * Handles the FILE field type used in forms. When a respondent uploads a file,
 * it is stored on the local filesystem under an {@code uploads/} folder in the
 * project root. The backend returns a relative URL that the frontend stores as
 * the submission value, and the file can later be downloaded via the serve
 * endpoint.
 *
 * Endpoints:
 * POST /api/upload — Accept a multipart file, save it with a UUID
 * filename, return {url, fileName}.
 * GET /api/files/{fileName} — Stream a previously uploaded file as a download.
 *
 * Application flow for a FILE field:
 * 1. Respondent selects a file on the public form page.
 * 2. Frontend sends a POST /api/upload request.
 * 3. This controller saves the file and returns
 * {@code "/api/files/<uuid>.ext"}.
 * 4. The frontend stores that URL as the field value and submits the form.
 * 5. On the responses page, the file URL is rendered as a Download link that
 * calls GET /api/files/{fileName}.
 *
 * Production note:
 * File storage on the local filesystem is suitable for development only. In
 * production, replace with cloud storage (e.g. AWS S3, Google Cloud Storage).
 *
 * CORS: explicitly set on this controller to align with the global WebConfig
 * setting.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class FileUploadController {

    /**
     * Absolute path to the local upload directory (created on startup if absent).
     */
    private final Path fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

    public FileUploadController() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    /**
     * POST /api/upload
     *
     * Accepts a multipart file upload. Generates a UUID-based filename to avoid
     * collisions while preserving the original extension. Returns a JSON body:
     * {@code {"url": "/api/files/<uuid.ext>", "fileName": "<original name>"}}
     *
     * @param file The uploaded {@code MultipartFile} sent with the key "file".
     * @return A map containing the relative access URL and the original filename.
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Preserve the original file extension
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }

            // UUID filename prevents collisions and hides original names
            String fileName = UUID.randomUUID().toString() + fileExtension;

            // Write the uploaded bytes to the local uploads/ directory
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Return a relative URL — the frontend prefixes it with the backend base URL
            Map<String, String> response = new HashMap<>();
            response.put("url", "/api/files/" + fileName);
            response.put("fileName", originalFileName);

            return ResponseEntity.ok(response);
        } catch (IOException ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not upload file"));
        }
    }

    /**
     * GET /api/files/{fileName}
     *
     * Serves a previously uploaded file as an octet-stream download. The filename
     * in the path is the UUID-based name generated at upload time.
     *
     * @param fileName The UUID-based filename (e.g. "3f2e...abc.pdf").
     * @return The file as a downloadable binary response, or 404 if not found.
     */
    @GetMapping("/files/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("application/octet-stream"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException ex) {
            return ResponseEntity.notFound().build();
        }
    }
}