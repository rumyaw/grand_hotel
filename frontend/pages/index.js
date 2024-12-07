import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Апарт-отель «Гранд Каньон»
        </h1>
        <p className={styles.description}>
          Добро пожаловать в систему бронирования
        </p>
        <button
          className={styles.button}
          onClick={() => router.push('/login')}
        >
          Войти в систему
        </button>
      </main>
    </div>
  );
}
