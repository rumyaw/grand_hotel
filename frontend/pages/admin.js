import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    rejected: 0
  });
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/login');
    } else {
      setUsername(storedUsername);
      fetchBookings();
      fetchStats();
    }
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/bookings', {
        withCredentials: true
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/stats', {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await axios.put(`http://localhost:8080/api/bookings/${bookingId}`, {
        status: newStatus
      }, { withCredentials: true });
      fetchBookings();
      fetchStats();
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleDelete = async (bookingId) => {
    try {
      await axios.delete(`http://localhost:8080/api/bookings/${bookingId}`, {
        withCredentials: true
      });
      fetchBookings();
      fetchStats();
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    localStorage.removeItem('username');
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <span>Администратор: {username}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Панель администратора</h1>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Всего заявок</h3>
            <p className={styles.statNumber}>{stats.total}</p>
          </div>
          <div className={styles.statCard}>
            <h3>В ожидании</h3>
            <p className={styles.statNumber}>{stats.pending}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Подтверждено</h3>
            <p className={styles.statNumber}>{stats.confirmed}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Отклонено</h3>
            <p className={styles.statNumber}>{stats.rejected}</p>
          </div>
        </div>

        <div className={styles.bookingList}>
          <h2>Все заявки</h2>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingCard}>
                <p>Тип номера: {booking.roomType}</p>
                <p>Гости: {booking.guests}</p>
                <p>Заезд: {new Date(booking.checkIn).toLocaleDateString()}</p>
                <p>Выезд: {new Date(booking.checkOut).toLocaleDateString()}</p>
                <p>Комментарий: {booking.comment}</p>
                <p>Статус: <span className={styles[`status${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`]}>
                  {booking.status}
                </span></p>
                <p>Дата создания: {new Date(booking.createdAt).toLocaleDateString()}</p>
                
                <div>
                  <button
                    className={`${styles.button} ${styles.statusConfirmed}`}
                    onClick={() => handleStatusChange(booking.id, 'confirmed')}
                  >
                    Подтвердить
                  </button>
                  <button
                    className={`${styles.button} ${styles.statusRejected}`}
                    onClick={() => handleStatusChange(booking.id, 'rejected')}
                  >
                    Отклонить
                  </button>
                  <button
                    className={styles.logoutButton}
                    onClick={() => handleDelete(booking.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.textGray600}>Нет активных бронирований</p>
          )}
        </div>
      </main>
    </div>
  );
}
