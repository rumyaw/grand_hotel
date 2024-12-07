import sqlite3
import sys
import os

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print("\n=== Утилита очистки базы данных ===\n")

def get_user_input(prompt):
    try:
        return input(prompt).strip().lower()
    except KeyboardInterrupt:
        print("\nОперация отменена пользователем")
        sys.exit(0)

def main():
    clear_screen()
    print_header()

    # Подключение к базе данных
    try:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hotel.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"Ошибка при подключении к базе данных: {e}")
        return

    try:
        # Получаем статистику перед очисткой
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM bookings")
        bookings_count = cursor.fetchone()[0]

        print(f"Текущая статистика:")
        print(f"- Пользователей в базе: {users_count}")
        print(f"- Бронирований в базе: {bookings_count}\n")

        # Запрашиваем подтверждение
        confirm = get_user_input("Вы уверены, что хотите очистить ВСЮ базу данных? (да/нет): ")
        if confirm != 'да':
            print("\nОперация отменена")
            return

        # Дополнительное подтверждение
        confirm2 = get_user_input("\nЭто действие НЕОБРАТИМО! Введите 'да, я понимаю' для подтверждения: ")
        if confirm2 != 'да, я понимаю':
            print("\nОперация отменена")
            return

        # Очистка таблиц
        cursor.execute("DELETE FROM bookings")
        cursor.execute("DELETE FROM users")
        
        # Сброс автоинкремента
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='users' OR name='bookings'")
        
        # Применяем изменения
        conn.commit()

        print("\nБаза данных успешно очищена!")
        print("- Все пользователи удалены")
        print("- Все бронирования удалены")
        print("- Счетчики ID сброшены")

    except sqlite3.Error as e:
        print(f"\nОшибка базы данных: {e}")
    except Exception as e:
        print(f"\nПроизошла ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
