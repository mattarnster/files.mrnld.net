CREATE TABLE IF NOT EXISTS users(
    id INT PRIMARY KEY ASC,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    verified BOOLEAN
);

CREATE TABLE IF NOT EXISTS uploads(
    id INT PRIMARY KEY ASC,
    userId INT ASC,
    fileName TEXT NOT NULL,
    uploadId TEXT NOT NULL,
    mimeType TEXT NOT NULL
);