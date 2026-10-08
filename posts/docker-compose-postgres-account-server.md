---
title: "Docker Compose로 PostgreSQL을 띄우고 C++ 서버와 연결하기"
description: "PostgreSQL만 Docker 컨테이너로 실행하는 개발 구성을 살펴보며 이미지, 컨테이너, 포트 매핑, 볼륨, healthcheck와 C++ 계정 서버의 DB 연결 구조를 정리합니다."
date: "2026-10-08"
category: "Study"
subcategory: "Game Server"
tags: ["Docker", "Docker Compose", "PostgreSQL", "C++", "Backend"]
featured: false
draft: false
aiGenerated: true
---

Docker를 도입했다고 해서 모든 프로그램을 컨테이너에 넣어야 하는 것은 아니다. 개발 환경에서는 데이터베이스처럼 설치와 초기화가 번거로운 의존성만 Docker로 실행하고, 애플리케이션은 익숙한 IDE와 디버거에서 직접 실행할 수 있다.

이 글에서 살펴볼 구성도 그렇다. PostgreSQL은 Docker Compose가 관리하는 컨테이너에서 실행하고, C++ 계정 서버는 Windows에서 직접 빌드하고 실행한다. 이 구성을 따라가면서 Docker의 이미지와 컨테이너, Compose, 포트 매핑과 named volume의 의미를 살펴보고 서버 코드가 데이터베이스와 어떻게 연결되는지 정리한다.

## 먼저 전체 구성을 보기

```text
개발 클라이언트 (같은 컴퓨터)
    │ HTTPS :8443
    ▼
C++ 계정 서버 (Windows 호스트 프로세스)
    │ PostgreSQL 연결: localhost:5432
    ▼
PostgreSQL 17 (Docker 컨테이너)
    │ 데이터 디렉터리
    ▼
Docker named volume
```

Compose 파일에는 `postgres` 서비스 하나만 정의되어 있다. 계정 서버를 빌드하는 `Dockerfile`이나 서버 컨테이너 서비스는 없다. 따라서 “계정 서버를 Docker로 배포한다”는 구성과는 다르다. Docker는 로컬 개발에 필요한 PostgreSQL을 준비하는 데 사용하고, 서버 프로그램은 Windows용 CMake preset으로 빌드해 호스트에서 실행한다.

## 이미지, 컨테이너, Compose

Docker **이미지**는 프로그램 실행에 필요한 파일과 라이브러리, 기본 설정을 묶은 읽기 전용 패키지다. `postgres:17`은 PostgreSQL 17을 실행하는 데 필요한 이미지다. **컨테이너**는 그 이미지를 바탕으로 실제 실행한 격리 프로세스다. 같은 이미지에서 컨테이너를 여러 개 만들 수 있지만, 각 컨테이너의 실행 상태와 쓰기 레이어는 별개다. 이미지와 컨테이너의 관계는 [Docker 이미지 소개](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)와 [컨테이너 소개](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)에서 확인할 수 있다.

Docker Compose는 여러 컨테이너와 그 설정을 YAML 파일에 선언하고 함께 관리하는 도구다. 이 구성에서는 서비스를 하나만 정의하지만, `docker compose up -d postgres` 명령 한 번으로 데이터베이스 컨테이너를 실행하고 중지·로그 확인을 같은 설정에 따라 처리할 수 있다. Compose의 기본 사용 흐름은 [Docker Compose 시작 안내](https://docs.docker.com/compose/gettingstarted/)에 정리되어 있다.

## Compose 파일 읽기

```yaml
services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: account_server
      POSTGRES_USER: account_server
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - account-server-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U account_server -d account_server"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s

volumes:
  account-server-postgres-data:
```

`services` 아래의 `postgres`는 Compose 서비스 이름이다. `image`는 사용할 이미지와 PostgreSQL 주 버전을 지정한다. `POSTGRES_DB`와 `POSTGRES_USER`는 초기 데이터베이스와 계정을 지정하고, 암호는 `.env`에서 가져온다. `${POSTGRES_PASSWORD:?...}` 표현식은 값이 없을 때 Compose 실행을 오류로 끝내므로 빈 암호로 데이터베이스를 띄우는 일을 막는다.

`restart: unless-stopped`는 컨테이너가 예기치 않게 종료되면 다시 시작하게 한다. 사용자가 명시적으로 정지한 경우에는 자동으로 다시 올리지 않는다. 이는 개발 중 데이터베이스 프로세스를 편하게 유지하는 설정이지, 백업이나 장애 복구를 대신하지는 않는다.

## 포트 매핑과 접속 주소

`"127.0.0.1:5432:5432"`는 `호스트 IP:호스트 포트:컨테이너 포트` 순서다. 컨테이너의 PostgreSQL 포트 5432를 호스트 컴퓨터의 127.0.0.1:5432에서만 접근하도록 연결한다. `127.0.0.1`로 제한했기 때문에 같은 개발 컴퓨터에서 실행하는 서버는 `localhost:5432`로 DB에 연결할 수 있고, 다른 컴퓨터의 네트워크 인터페이스에는 포트를 공개하지 않는다. 계정 서버의 기본 HTTPS 바인딩 주소도 `127.0.0.1`이므로, 이 개발 구성에서는 API를 같은 컴퓨터에서 실행하는 클라이언트가 호출한다. Compose 포트 문법은 호스트 IP를 생략하면 모든 인터페이스에 바인딩될 수 있으므로, 외부 공개가 필요 없는 개발 DB에는 바인딩 주소를 명시하는 이유가 있다. 자세한 문법은 [Compose 서비스의 ports 설정](https://docs.docker.com/reference/compose-file/services/#ports)을 참고한다.

호스트 포트와 컨테이너 포트는 각각 다른 주소 공간에 속한다. 현재처럼 계정 서버가 호스트에서 실행될 때는 `DATABASE_URL`의 호스트가 `localhost`다. 나중에 애플리케이션도 Compose 서비스로 옮긴다면 같은 Compose 네트워크 안에서는 호스트 포트가 아니라 서비스 이름과 컨테이너 포트인 `postgres:5432`로 연결해야 한다. Compose는 같은 네트워크에 있는 서비스를 이름으로 찾을 수 있도록 DNS를 제공한다. 이 차이는 [Compose 네트워킹 안내](https://docs.docker.com/compose/how-tos/networking/)의 서비스 검색 설명과 연결된다.

## Named volume으로 DB 데이터 보존하기

컨테이너의 파일 시스템에만 저장한 데이터는 컨테이너를 제거하고 새로 만들 때 사라질 수 있다. PostgreSQL의 데이터 디렉터리를 컨테이너 수명과 분리하려고 named volume을 사용한다.

```yaml
volumes:
  - account-server-postgres-data:/var/lib/postgresql/data
```

왼쪽은 Docker가 관리하는 `account-server-postgres-data`라는 볼륨이고, 오른쪽은 PostgreSQL 컨테이너 안의 데이터 저장 경로다. 컨테이너를 교체해도 볼륨은 남기 때문에 개발 데이터가 유지된다. 일반적인 `docker compose down`은 컨테이너를 내리지만 이 named volume은 보존한다. `docker compose down -v`는 볼륨까지 삭제하므로 로컬 DB 데이터를 초기화할 때만 사용해야 한다. 볼륨의 수명과 컨테이너 쓰기 레이어와의 차이는 [Docker 볼륨 문서](https://docs.docker.com/engine/storage/volumes/)에 설명되어 있다.

볼륨은 지속 저장을 돕지만 백업은 아니다. 실제 서비스 데이터라면 별도 백업, 복구 연습, 접근 제어와 보존 정책이 필요하다. 개발 볼륨을 지우는 명령도 운영 데이터에 같은 영향을 주지 않도록 환경을 분리해야 한다.

## Healthcheck와 애플리케이션 준비 상태

Compose의 `healthcheck`는 컨테이너 안에서 `pg_isready`를 주기적으로 실행해 PostgreSQL이 연결을 받을 준비가 되었는지 확인한다. 컨테이너 프로세스가 실행 중이라는 사실만으로 DB가 쿼리를 받을 준비가 끝났다고 볼 수 없기 때문에, 단순한 실행 상태와 서비스 준비 상태를 구분하는 데 유용하다. Compose에서 `depends_on`과 `service_healthy`를 함께 쓰면 종속 서비스가 DB healthcheck를 통과한 뒤 시작하도록 구성할 수도 있다. 이 동작은 [Compose 시작 순서와 healthcheck 안내](https://docs.docker.com/compose/how-tos/startup-order/)에 나온다.

현재 Compose에는 PostgreSQL 서비스만 있으므로 이 healthcheck가 계정 서버의 시작을 직접 제어하지는 않는다. 계정 서버가 Windows 프로세스로 따로 실행되기 때문이다. 대신 서버가 시작하면서 DB 연결 풀을 만들고, 마이그레이션을 적용한다. 연결이나 마이그레이션에 실패하면 시작 단계에서 오류를 내고 종료한다.

서버에는 목적이 다른 두 상태 확인 경로도 있다.

- `GET /v1/health/live`는 프로세스가 요청을 처리하고 있음을 나타내는 liveness 응답이다.
- `GET /v1/health/ready`는 DB 작업자 큐를 통해 PostgreSQL에 `SELECT 1`을 실행한다. DB를 사용할 수 없으면 준비되지 않았다는 응답을 돌려준다.

Docker healthcheck는 DB 컨테이너 내부에서 DB 프로세스의 준비 상태를 확인하고, 애플리케이션의 readiness는 서버가 실제 DB 작업을 수행할 수 있는지 확인한다. 둘은 확인 위치와 질문이 다르다.

## C++ 서버는 DB 작업을 어떻게 처리하나

계정 서버의 HTTP 계층은 Boost.Beast를 사용하고, Windows 빌드에서는 Boost.Asio의 IOCP 기반 비동기 소켓 I/O를 사용한다. 설정 기본값은 I/O 스레드 4개다. PostgreSQL 호출은 동기식이므로 네트워크 완료를 처리하는 스레드에서 바로 실행하면 느린 쿼리가 다른 연결의 HTTP 처리를 막을 수 있다.

이를 피하려고 서버는 별도의 DB 작업자 풀을 둔다. 시작 코드에서 DB 연결 풀은 연결 8개, DB 작업자 풀은 스레드 4개와 대기 작업 최대 256개로 생성된다. 요청의 DB 처리를 작업자 큐에 넘기고, 작업이 끝나면 완료 콜백으로 HTTP 응답을 돌려주는 구조다. 연결 풀은 매 요청마다 새 DB 연결을 만들고 닫는 비용을 줄이고, 작업 큐는 네트워크 처리와 동기 DB 작업의 실행 경계를 나눈다.

```text
HTTPS 요청
    → IOCP 기반 HTTP 처리
    → DB 작업 큐에 등록
    → DB 작업자 스레드가 연결 풀에서 연결 획득
    → PostgreSQL 쿼리 수행
    → 완료 콜백으로 HTTP 응답
```

큐와 풀에는 한계가 있다. DB가 느려지면 작업이 쌓이고, 큐가 가득 차면 더 많은 요청을 무한정 메모리에 보관할 수 없다. 동시에 연결 풀보다 많은 DB 작업자가 연결을 요청하면 일부는 연결이 반환될 때까지 기다린다. 따라서 스레드 수, 큐 길이, 연결 수는 서로 독립된 숫자가 아니라 DB 처리량과 대기 시간을 조정하는 용량 설정이다.

## 마이그레이션과 환경 변수

계정 서버는 `DATABASE_URL`, TLS 인증서 경로, 개인 키 경로를 프로세스 환경 변수에서 읽는다. 로컬 개발에서는 Compose용 `.env`와 계정 서버 프로세스 환경을 구분해야 한다. Compose가 `.env`를 읽어 `POSTGRES_PASSWORD`를 보간하더라도, PowerShell에서 직접 실행하는 Windows 프로그램이 그 파일을 자동으로 환경 변수로 가져오지는 않는다. 서버를 실행하기 전에 PowerShell 프로세스에 `DATABASE_URL`, `TLS_CERT_FILE`, `TLS_KEY_FILE` 등을 설정하는 이유다.

서버는 시작할 때 SQL 파일을 이름순으로 읽고, 이미 적용한 마이그레이션은 `schema_migrations` 테이블로 판별한다. 마이그레이션마다 트랜잭션을 사용하고 PostgreSQL advisory lock으로 동시에 실행되는 시작 작업이 스키마를 경합해 변경하지 않도록 한다. 이 때문에 개발자가 DB 컨테이너를 올린 뒤 서버를 실행하면 필요한 스키마가 적용된다.

로컬 TLS 인증서는 개발용 self-signed 인증서다. 로컬 테스트에서는 클라이언트가 그 인증서를 명시적으로 신뢰하도록 설정할 수 있지만, 운영 인증서나 비밀 키를 저장소에 넣어서는 안 된다. 운영 환경은 별도의 인증서·비밀 관리 절차와 실제 TLS 인증서를 사용해야 한다.

## 로컬 실행 흐름

저장소의 안내를 간단히 정리하면 다음과 같다.

```powershell
Copy-Item .env.example .env
# .env의 개발용 암호를 로컬 값으로 교체
docker compose up -d postgres

# Visual Studio Developer PowerShell에서 계정 서버 설정
$env:DATABASE_URL = 'postgresql://account_server:로컬암호@127.0.0.1:5432/account_server'
$env:TLS_CERT_FILE = (Resolve-Path .\build\certs\dev-cert.pem).Path
$env:TLS_KEY_FILE = (Resolve-Path .\build\certs\dev-key.pem).Path

cmake --preset windows-debug
cmake --build --preset windows-debug
```

실행 명령의 출처와 인증서 생성 절차, 나머지 설정은 서버 README를 기준으로 한다. `docker compose up -d postgres`의 목적은 DB 의존성을 준비하는 것이고, CMake 명령은 Windows 네이티브 서버 실행 파일을 빌드하는 것이다. 두 과정을 분리하면 DB 버전과 데이터를 안정적으로 유지하면서도 C++ 코드를 IDE에서 빠르게 수정하고 디버깅할 수 있다.

## 정리

Docker는 애플리케이션 전체를 반드시 컨테이너화해야만 유용한 도구가 아니다. 이 개발 구성에서는 PostgreSQL 17의 실행과 데이터 저장을 Compose와 named volume에 맡기고, C++ 서버는 호스트에서 직접 실행한다. 포트를 로컬 인터페이스에만 공개하고, DB 준비 상태와 애플리케이션 준비 상태를 각각 확인하며, 네트워크 I/O와 동기 DB 작업을 별도 풀로 나눈 점이 실제 구현에서 기억할 부분이다.

## 참고 자료

- [Docker 이미지란 무엇인가](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/) · [Docker 컨테이너란 무엇인가](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [Docker Compose 시작 안내](https://docs.docker.com/compose/gettingstarted/) · [Compose 네트워킹](https://docs.docker.com/compose/how-tos/networking/)
- [Compose 서비스의 포트 설정](https://docs.docker.com/reference/compose-file/services/#ports) · [Docker 볼륨](https://docs.docker.com/engine/storage/volumes/)
- [Compose 시작 순서와 healthcheck](https://docs.docker.com/compose/how-tos/startup-order/)
