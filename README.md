# ShuttleHub - Quản lý sân cầu lông

Ứng dụng quản lý sân cầu lông với Spring Boot và PostgreSQL.

## 🚀 Công nghệ sử dụng

- **Backend**: Spring Boot 4.1.1
- **Database**: PostgreSQL
- **Build Tool**: Maven

## 📦 Cài đặt

1. Clone repository:
```bash
git clone https://github.com/sonki236/ShuttleHub_QL_san_cau_long.git
```

2. Cấu hình database trong `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=YOUR_PASSWORD
```

3. Chạy ứng dụng:
```bash
cd backend
mvn spring-boot:run
```

## 📁 Cấu trúc dự án

```
backend/
├── src/main/java/vn/ShuttleHub/
│   ├── backend/          # Main application
│   ├── entity/           # JPA Entities (Domain objects)
│   ├── repository/       # Data access layer
│   ├── service/         # Business logic
│   └── controller/      # REST API endpoints
└── src/main/resources/
    └── application.properties
```

## 🌐 API Endpoints

(Sẽ được cập nhật khi xây dựng chức năng)

## 👤 Author

- **GitHub**: [@sonki236](https://github.com/sonki236)

## 📝 License

This project is for educational purposes.
