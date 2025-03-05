erDiagram
    DEPARTMENT {
        int department_id PK
        varchar(10) department_name
    }
    HOBBY {
        int hobby_id PK
        varchar(255) hobby_name
    }
    USER {
        int user_id PK
        varchar(20) user_name
        int student_id
        int phonenumber
        varchar(100) wechat_id
        varchar(255) email
        varchar(255) user_avatar
        varchar(255) self_introduce
        varchar(255) qr_url
        int role
    }
    APPLICATION {
        int application_id PK
        int user_id FK
        int department_id FK
        int priority
    }
    HOBBY_USER {
        int id PK
        int hobby_id FK
        int user_id FK
    }
    USER_PROJECT {
        int user_project_id PK
        int user_id FK
        varchar(20) project_name
        varchar(255) project_url
    }
    USER_SKILL {
        int skill_id PK
        int user_id FK
        int skill_socre
        varchar(20) skill_name
    }

    USER ||--o{ APPLICATION : "has applied"
    DEPARTMENT ||--o{ APPLICATION : "accepts applications"
    USER ||--o{ HOBBY_USER : "has hobbies"
    HOBBY ||--o{ HOBBY_USER : "is enjoyed by"
    USER ||--o{ USER_PROJECT : "has projects"
    USER ||--o{ USER_SKILL : "has skills"
