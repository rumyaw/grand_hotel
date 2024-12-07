package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
	"github.com/dgrijalva/jwt-go"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type Booking struct {
	ID          int       `json:"id"`
	UserID      int       `json:"userId"`
	RoomType    string    `json:"roomType"`
	Guests      int       `json:"guests"`
	CheckIn     string    `json:"checkIn"`
	CheckOut    string    `json:"checkOut"`
	Comment     string    `json:"comment"`
	Status      string    `json:"status"`
	CreatedAt   string    `json:"createdAt"`
}

var db *sql.DB
var jwtKey = []byte("your_secret_key")

func initDB() {
	var err error
	dbPath := "./backend/hotel.db"
	if _, err := os.Stat("./backend"); os.IsNotExist(err) {
		dbPath = "./hotel.db"
	}
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal(err)
	}

	// Создание таблиц
	createTables := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		role TEXT DEFAULT 'client'
	);
	CREATE TABLE IF NOT EXISTS bookings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		room_type TEXT NOT NULL,
		guests INTEGER NOT NULL,
		check_in TEXT NOT NULL,
		check_out TEXT NOT NULL,
		comment TEXT,
		status TEXT DEFAULT 'pending',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`

	_, err = db.Exec(createTables)
	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	initDB()
	defer db.Close()

	r := mux.NewRouter()

	// Маршруты для аутентификации
	r.HandleFunc("/api/register", register).Methods("POST")
	r.HandleFunc("/api/login", login).Methods("POST")

	// Маршруты для бронирований
	r.HandleFunc("/api/bookings", createBooking).Methods("POST")
	r.HandleFunc("/api/bookings", getBookings).Methods("GET")
	r.HandleFunc("/api/bookings/{id}", updateBookingStatus).Methods("PUT")
	r.HandleFunc("/api/bookings/{id}", deleteBooking).Methods("DELETE")
	r.HandleFunc("/api/stats", getStats).Methods("GET")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		Debug:           true,
	})

	handler := c.Handler(r)
	log.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func register(w http.ResponseWriter, r *http.Request) {
	var user User
	json.NewDecoder(r.Body).Decode(&user)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("INSERT INTO users (username, password, role) VALUES (?, ?, 'client')",
		user.Username, string(hashedPassword))
	if err != nil {
		http.Error(w, "Username already exists", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func login(w http.ResponseWriter, r *http.Request) {
	var user User
	json.NewDecoder(r.Body).Decode(&user)

	var dbUser User
	err := db.QueryRow("SELECT id, username, password, role FROM users WHERE username = ?",
		user.Username).Scan(&dbUser.ID, &dbUser.Username, &dbUser.Password, &dbUser.Role)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(user.Password))
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":   dbUser.ID,
		"role": dbUser.Role,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error creating token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    tokenString,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"role":     dbUser.Role,
		"username": dbUser.Username,
		"userId":   dbUser.ID,
	})
}

func createBooking(w http.ResponseWriter, r *http.Request) {
	var booking Booking
	json.NewDecoder(r.Body).Decode(&booking)

	result, err := db.Exec(`
		INSERT INTO bookings (user_id, room_type, guests, check_in, check_out, comment, status)
		VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
		booking.UserID, booking.RoomType, booking.Guests, booking.CheckIn, booking.CheckOut, booking.Comment)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	booking.ID = int(id)
	json.NewEncoder(w).Encode(booking)
}

func getBookings(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	var rows *sql.Rows
	var err error

	if userID != "" {
		rows, err = db.Query(`
			SELECT id, user_id, room_type, guests, check_in, check_out, comment, status, created_at
			FROM bookings WHERE user_id = ?`, userID)
	} else {
		rows, err = db.Query(`
			SELECT id, user_id, room_type, guests, check_in, check_out, comment, status, created_at
			FROM bookings`)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bookings []Booking
	for rows.Next() {
		var b Booking
		rows.Scan(&b.ID, &b.UserID, &b.RoomType, &b.Guests, &b.CheckIn, &b.CheckOut,
			&b.Comment, &b.Status, &b.CreatedAt)
		bookings = append(bookings, b)
	}

	json.NewEncoder(w).Encode(bookings)
}

func updateBookingStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var booking Booking
	json.NewDecoder(r.Body).Decode(&booking)

	_, err := db.Exec("UPDATE bookings SET status = ? WHERE id = ?",
		booking.Status, vars["id"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func deleteBooking(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	_, err := db.Exec("DELETE FROM bookings WHERE id = ?", vars["id"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getStats(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		Total     int `json:"total"`
		Pending   int `json:"pending"`
		Confirmed int `json:"confirmed"`
		Rejected  int `json:"rejected"`
	}

	err := db.QueryRow("SELECT COUNT(*) FROM bookings").Scan(&stats.Total)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = db.QueryRow("SELECT COUNT(*) FROM bookings WHERE status = 'pending'").Scan(&stats.Pending)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = db.QueryRow("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'").Scan(&stats.Confirmed)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = db.QueryRow("SELECT COUNT(*) FROM bookings WHERE status = 'rejected'").Scan(&stats.Rejected)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(stats)
}
