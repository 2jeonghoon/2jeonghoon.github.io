---
title: "언리얼 네트워크 공부 01: 클라이언트·서버 프레임워크와 로그인"
description: "언리얼 멀티플레이의 서버 권한 모델, NetMode, Listen/Dedicated Server, GameMode 중심의 접속과 로그인 흐름을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine", "Networking", "Client Server", "GameMode", "Login"]
featured: false
draft: true
aiGenerated: true
---

싱글 플레이에서는 하나의 프로세스가 월드의 유일한 상태를 가진다. 멀티플레이에서는 서버와 각 클라이언트가 같은 종류의 액터를 서로 다른 인스턴스로 보유한다. 화면에 같은 캐릭터가 보여도 메모리 주소와 역할은 다르며, 네트워크를 통해 필요한 상태만 전달된다.

언리얼 네트워크 학습의 출발점은 “이 코드는 몇 번 실행되는가?”보다 **어느 머신의 어떤 인스턴스에서 실행되고 그 결과를 누가 신뢰하는가?**를 묻는 것이다.

## 서버 권한 모델

일반적인 언리얼 멀티플레이에서는 서버가 권위 있는 게임 상태를 소유한다.

```text
Client A ── 입력 요청 ──┐
                       ↓
                    Server
                 규칙 검증·상태 변경
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
     Client A Proxy            Client B Proxy
        결과 반영                  결과 반영
```

클라이언트는 이동이나 공격의 의도를 서버에 요청할 수 있지만 보상, 체력, 승패 같은 최종 상태를 스스로 확정해서는 안 된다. 서버 상태가 각 클라이언트의 복제본에 전달되고, 클라이언트는 그 결과를 화면에 표현한다.

서버 권한이 모든 시각 효과까지 서버 응답 뒤에만 실행하라는 뜻은 아니다. 조작감이 중요한 로컬 표현은 예측할 수 있지만 최종 판정과 불일치 복구 경로가 있어야 한다.

## NetMode 구분

실행 인스턴스의 형태는 `ENetMode`로 구분한다.

| NetMode | 의미 |
| --- | --- |
| `NM_Standalone` | 네트워크 연결 없이 혼자 실행 |
| `NM_ListenServer` | 한 플레이어가 서버이자 로컬 클라이언트 역할 수행 |
| `NM_DedicatedServer` | 화면과 로컬 플레이어 없이 서버 역할만 수행 |
| `NM_Client` | 원격 서버에 접속한 클라이언트 |

Listen Server의 호스트는 서버와 로컬 플레이어 특성을 함께 가지므로 테스트에서 전용 서버와 다른 결과가 날 수 있다. 호스트에게만 정상인 UI나 입력 코드가 원격 클라이언트에서는 실패하지 않는지 확인한다.

Dedicated Server는 렌더링과 로컬 UI가 없으므로 `GetFirstPlayerController()`나 뷰포트가 항상 있다고 가정하면 안 된다. 서버 전용 빌드에서는 콘텐츠와 로직의 서버 필요 여부도 구분할 수 있다.

## 프레임워크 클래스의 네트워크 위치

| 클래스 | 서버 | 소유 클라이언트 | 다른 클라이언트 |
| --- | --- | --- | --- |
| `GameMode` | 존재 | 없음 | 없음 |
| `GameState` | 원본 | 복제본 | 복제본 |
| `PlayerController` | 각 플레이어별 존재 | 자기 것만 존재 | 보통 타인의 것은 없음 |
| `PlayerState` | 원본 | 모든 관련 PlayerState 복제 | 모든 관련 PlayerState 복제 |
| Pawn/Character | 권위 인스턴스 | 자기/타인 프록시 | 자기/타인 프록시 |

따라서 전체 점수판처럼 모두에게 보여야 하는 값은 GameMode에만 저장하면 클라이언트가 읽을 수 없다. 경기 전체 상태는 GameState, 플레이어별 공유 상태는 PlayerState에 복제하는 구성이 자연스럽다.

## 서버 시작과 월드 준비

서버는 맵을 열고 GameMode를 만든 뒤 접속을 받을 준비를 한다. 접속 과정의 세부 패킷은 엔진이 처리하지만 게임 코드는 GameMode의 단계별 훅에서 참가 허용과 초기화를 제어한다.

```text
클라이언트 연결 요청
  ↓
PreLogin        접속 조건 검사, 오류 문자열로 거절 가능
  ↓
Login           PlayerController 생성
  ↓
PostLogin       Controller가 준비된 뒤 게임 참가 처리
  ↓
HandleStartingNewPlayer / RestartPlayer
  ↓
Pawn 생성과 Possess
```

정확한 엔진 내부 순서는 여행 방식과 버전에 따라 추가 단계가 있지만, `PreLogin`은 승인 전 검증, `PostLogin`은 접속이 성립한 플레이어의 게임 초기화라는 책임을 가진다.

로그인 훅에서 오래 걸리는 외부 DB 요청을 동기적으로 기다리면 게임 스레드를 막을 수 있다. 인증 서비스와 게임 월드 입장 사이의 비동기 상태를 설계하고, 타임아웃과 접속 취소를 처리한다.

## 네트워크 로그에 실행 위치 표시하기

같은 로그가 서버와 클라이언트 콘솔에 섞이면 어디서 실행된 코드인지 판단하기 어렵다. 월드의 NetMode와 액터의 로컬 역할, 객체 이름을 함께 기록한다.

```cpp
const TCHAR* NetModeName = GetNetMode() == NM_DedicatedServer ? TEXT("DedicatedServer") :
                           GetNetMode() == NM_ListenServer    ? TEXT("ListenServer") :
                           GetNetMode() == NM_Client          ? TEXT("Client") :
                                                                TEXT("Standalone");

UE_LOG(LogTemp, Log, TEXT("[%s][%s] BeginPlay"),
       NetModeName,
       *GetNameSafe(this));
```

여기에 LocalRole, RemoteRole, Owner와 Owning PlayerController를 추가하면 RPC와 복제 문제를 추적하기 쉬워진다. 로그 매크로는 편의를 위한 도구이며 권한 판정 자체를 문자열이나 NetMode만으로 구현하지 않는다.

## PIE 테스트 매트릭스

에디터에서 클라이언트 수를 늘리는 것만으로 충분하지 않다.

- Standalone 한 개
- Listen Server + 원격 클라이언트
- Dedicated Server + 둘 이상의 클라이언트
- 지연 참가(Late Join)
- 서버 여행과 재접속
- 한 클라이언트의 비정상 종료

각 창에서 서버, 소유 클라이언트, 관찰 클라이언트를 구분해 로그와 화면을 본다. 호스트 화면만 확인하면 서버와 로컬 클라이언트가 같은 프로세스에 있어 숨겨지는 오류가 많다.

## 복습 질문

- GameMode의 값을 클라이언트 UI가 직접 읽을 수 없는 이유는 무엇인가?
- Listen Server에서만 정상인 코드가 Dedicated Server에서 실패할 수 있는 이유는 무엇인가?
- `PreLogin`과 `PostLogin`에는 각각 어떤 검사를 두어야 하는가?
- 서버 권한 모델과 클라이언트 예측은 왜 모순되지 않는가?

## 참고 자료

- [DesignerD: UE 개념정리 - Network](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 이득우의 언리얼 프로그래밍 Part3 정리](https://meo-young.tistory.com/category/%EA%B0%95%EC%9D%98/%5B%EA%B0%95%EC%9D%98%5D%20%EC%9D%B4%EB%93%9D%EC%9A%B0%EC%9D%98%20%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%98%EB%B0%8D%20Part3)
