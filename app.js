require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const { v4: uuid } = require("uuid");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("./config/s3");

const app = express();

app.use(express.json());

// Multer Configuration
const upload = multer({
    storage: multer.memoryStorage(),
});

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect(err => {
    if (err) {
        console.error("MySQL Connection Error:", err);
        process.exit(1);
    }

    console.log("MySQL Connected.");
});

// Home
app.get("/", (req, res) => {
    res.send("Employee API Running..");
});

// Upload Image to S3
app.post("/upload", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Please select an image."
            });
        }

        const fileName = `${uuid()}-${req.file.originalname}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        });

        await s3.send(command);

        const imageUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        res.json({
            message: "Image Uploaded Successfully",
            imageUrl,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Upload Failed",
            error: err.message,
        });

    }

});

// Get Employees
app.get("/employees", (req, res) => {
    db.query("SELECT * FROM employees", (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Add Employee
app.post("/employees", (req, res) => {

    const { name, email,profile_image  } = req.body;

    db.query(
        "INSERT INTO employees(name,email,profile_image) VALUES(?,?,?)",
        [name, email,profile_image],
        (err, result) => {
            if (err) throw err;

            res.json({
                message: "Employee Added"
            });
        }
    );
});

// Update Employee
app.put("/employees/:id", (req, res) => {

    const { name, email } = req.body;

    db.query(
        "UPDATE employees SET name=?, email=?,profile_image=? WHERE id=?",
        [name, email, profile_image, req.params.id],
        (err, result) => {

            if (err) throw err;

            res.json({
                message: "Employee Updated"
            });

        });

});

// Delete Employee
app.delete("/employees/:id", (req, res) => {

    db.query(
        "DELETE FROM employees WHERE id=?",
        [req.params.id],
        (err, result) => {

            if (err) throw err;

            res.json({
                message: "Employee Deleted"
            });

        });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Started on Port ${PORT}`);
});