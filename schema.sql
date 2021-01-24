CREATE TABLE IF NOT EXISTS users(
    id INT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    verified BOOLEAN
);

CREATE TABLE IF NOT EXISTS uploads(
    userId INT NOT NULL,
    fileName TEXT NOT NULL,
    uploadId TEXT NOT NULL
);