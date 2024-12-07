import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function Client() {
  const [bookings, setBookings] = useState([]);  
  const [username, setUsername] = useState('');
  const router = useRouter();
  const [formData, setFormData] = useState({
    roomType: 'studio',
    guests: 1,
    checkIn: '',
    checkOut: '',
    comment: ''
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/login');
      return;
    }
    setUsername(storedUsername);
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('User ID not found');
        return;
      }
      const response = await axios.get(`http://localhost:8080/api/bookings?userId=${userId}`, {
        withCredentials: true
      });
      setBookings(response.data || []); 
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]); 
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      await axios.post('http://localhost:8080/api/bookings', {
        ...formData,
        userId: parseInt(userId)
      }, { withCredentials: true });
      
      fetchBookings();
      setFormData({
        roomType: 'studio',
        guests: 1,
        checkIn: '',
        checkOut: '',
        comment: ''
      });
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <span>Пользователь: {username}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Бронирование номера</h1>

        <form className={styles.bookingForm} onSubmit={handleSubmit}>
          <div>
            <label className={styles.label}>Тип номера:</label>
            <select
              name="roomType"
              className={styles.select}
              value={formData.roomType}
              onChange={handleChange}
            >
              <option value="studio">Студия</option>
              <option value="one_room">Однокомнатный</option>
              <option value="two_room">Двухкомнатный</option>
            </select>
          </div>

          <div>
            <label className={styles.label}>Количество гостей:</label>
            <input
              type="number"
              name="guests"
              className={styles.input}
              value={formData.guests}
              onChange={handleChange}
              min="1"
              max="4"
            />
          </div>

          <div>
            <label className={styles.label}>Дата заезда:</label>
            <input
              type="date"
              name="checkIn"
              className={styles.input}
              value={formData.checkIn}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className={styles.label}>Дата выезда:</label>
            <input
              type="date"
              name="checkOut"
              className={styles.input}
              value={formData.checkOut}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className={styles.label}>Комментарий:</label>
            <textarea
              name="comment"
              className={styles.input}
              value={formData.comment}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <button type="submit" className={styles.button}>
            Отправить заявку
          </button>
        </form>

        <div className={styles.bookingList}>
          <h2>Мои заявки</h2>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingCard}>
                <p>Тип номера: {booking.roomType}</p>
                <p>Гости: {booking.guests}</p>
                <p>Заезд: {new Date(booking.checkIn).toLocaleDateString()}</p>
                <p>Выезд: {new Date(booking.checkOut).toLocaleDateString()}</p>
                <p>Статус: <span className={styles[`status${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`]}>
                  {booking.status}
                </span></p>
                <p>Дата создания: {new Date(booking.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          ) : (
            <p className={styles.textGray600}>У вас пока нет бронирований</p>
          )}
        </div>
      </main>
    </div>
  );
}
