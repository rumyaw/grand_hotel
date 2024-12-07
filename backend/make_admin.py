import sqlite3
import sys
import os

ADMIN_KEY = "Made_by_Ruslan"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print("\n=== Утилита управления правами пользователей ===\n")

def get_user_input(prompt):
    try:
        return input(prompt).strip()
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
        # Запрос имени пользователя
        username = get_user_input("Введите имя пользователя: ")

        # Проверка существования пользователя
        cursor.execute("SELECT id, username, role FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if not user:
            print("\nПользователь не найден!")
            return

        user_id, username, role = user

        if role == 'admin':
            print("\nЭтот пользователь уже является администратором!")
            return

        # Запрос ключа администрации
        admin_key = get_user_input("\nВведите ключ администрации: ")
        if admin_key != ADMIN_KEY:
            print("\nНеверный ключ администрации!")
            return

        # Подтверждение действия
        confirm = get_user_input("\nСделать пользователя администратором? (да/нет): ").lower()
        if confirm != 'да':
            print("\nОперация отменена")
            return

        # Обновление роли пользователя
        cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user_id,))
        conn.commit()

        print(f"\nПользователь {username} успешно стал администратором!")

    except sqlite3.Error as e:
        print(f"\nОшибка базы данных: {e}")
    except Exception as e:
        print(f"\nПроизошла ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()