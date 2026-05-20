package com.enhix.backend;

public class UploadResponse {
    private boolean ok;
    private String message;
    private String filename;
    private String type;

    public UploadResponse() {}

    public UploadResponse(boolean ok, String message, String filename, String type) {
        this.ok = ok;
        this.message = message;
        this.filename = filename;
        this.type = type;
    }

    public boolean isOk() { return ok; }
    public void setOk(boolean ok) { this.ok = ok; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
