---
title: "언리얼 네트워크 공부 02: Connection, Ownership와 Actor Role"
description: "NetConnection이 플레이어와 액터 소유권에 연결되는 과정, Authority·AutonomousProxy·SimulatedProxy의 의미와 RPC 실행 조건을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine", "Networking", "Ownership", "Actor Role", "Connection"]
featured: false
draft: true
aiGenerated: true
---

언리얼에서 “이 액터는 내 것”이라는 말은 게임 디자인상의 소유와 네트워크 소유가 같다는 뜻이 아니다. 네트워크 Ownership은 액터에서 Owner 체인을 따라가 특정 PlayerController의 연결에 도달할 수 있는지로 결정되며, RPC 라우팅과 조건부 복제, Relevancy에 영향을 준다.

## Connection의 중심은 PlayerController다

클라이언트가 서버에 연결되면 서버는 해당 연결과 연결된 PlayerController를 가진다. PlayerController가 Pawn을 Possess하면 Pawn은 그 플레이어의 입력 주체가 되고, PlayerController까지 이어지는 소유 관계를 통해 owning connection을 판단할 수 있다.

```text
NetConnection
     ↕
PlayerController
     │ Possess / Owner chain
     ↓
Character ──> Weapon ──> Ability Actor
```

모든 Actor가 owning connection을 가지는 것은 아니다. 월드의 문, 중립 NPC, GameState처럼 특정 플레이어 소유가 아닌 액터도 많다.

`SetOwner`를 호출했다고 게임 규칙상 소유권 검증이 자동으로 끝나는 것도 아니다. Owner는 네트워크 라우팅에 영향을 주므로 서버가 신뢰할 수 있는 규칙으로 설정해야 한다.

## LocalRole을 현재 머신 관점에서 읽는다

같은 네트워크 Actor는 머신마다 다른 역할을 가진다.

| Role | 의미 |
| --- | --- |
| `ROLE_Authority` | 해당 액터의 권위 있는 원본. 일반 네트워크 게임에서는 서버에 존재 |
| `ROLE_AutonomousProxy` | 로컬 플레이어가 직접 조종하며 예측할 수 있는 프록시 |
| `ROLE_SimulatedProxy` | 서버에서 받은 상태를 바탕으로 시뮬레이션하는 원격 프록시 |
| `ROLE_None` | 네트워크 복제 역할이 없음 |

클라이언트 A가 자신의 캐릭터를 보면 AutonomousProxy지만, 클라이언트 B가 A의 캐릭터를 보면 SimulatedProxy다. 서버의 A 캐릭터는 Authority다.

```text
                 Server     Client A       Client B
A의 Character    Authority  Autonomous     Simulated
B의 Character    Authority  Simulated      Autonomous
```

`HasAuthority()`는 “내가 서버 애플리케이션인가?”보다 해당 Actor 인스턴스가 권위를 가졌는지 묻는 함수다. UI나 입력처럼 로컬 제어 여부가 중요할 때는 `IsLocallyControlled()`가 더 맞는 질문일 수 있다.

## 초기화 시점마다 준비된 정보가 다르다

생성자나 `PostInitializeComponents`에서 Controller와 owning connection이 이미 있다고 가정하면 실패할 수 있다. Pawn은 먼저 스폰되고 나중에 Possess될 수 있으며, 복제본에서 Controller 정보가 도착하는 시점도 다르다.

상황별 콜백을 사용한다.

- `PossessedBy`: 서버에서 Controller가 Pawn을 Possess했을 때
- `OnRep_Controller`: 클라이언트에 Controller 변경이 복제됐을 때
- `OnRep_PlayerState`: Pawn이 PlayerState를 사용할 준비가 됐을 때
- `BeginPlay`: 월드 플레이가 시작됐지만 모든 네트워크 참조가 완전히 도착했다는 보장은 아님

초기화 함수가 여러 경로에서 호출되어도 안전하도록 idempotent하게 만들면 서버와 클라이언트의 시점 차이를 다루기 쉽다.

## Ownership이 RPC에 미치는 영향

클라이언트가 Server RPC를 보내려면 일반적으로 그 클라이언트가 owning connection을 가진 replicated Actor에서 호출해야 한다. 클라이언트가 월드에 놓인 소유권 없는 문 액터에서 직접 Server RPC를 호출하면 서버에 전달되지 않을 수 있다.

이 경우 플레이어가 소유한 Character나 PlayerController에서 상호작용 요청을 보내고 서버가 대상 문을 검증한다.

```text
잘못된 흐름
Client → 소유하지 않은 Door.ServerOpen()

권장 흐름
Client Character.ServerTryInteract(Door)
  → Server: 거리·시야·상태 검증
  → Door의 권위 상태 변경
  → 결과 Replication
```

서버가 Client RPC를 호출할 때도 대상 Actor의 owning connection을 사용해 어느 클라이언트에서 실행할지 정한다. 소유권이 없는 Actor의 Client RPC는 의도한 대상으로 가지 않는다.

## 조건부 복제와 Relevancy

소유 관계는 RPC 외에도 다음에 쓰인다.

- `bOnlyRelevantToOwner`: 소유 연결에만 Actor를 관련 있는 것으로 취급
- `COND_OwnerOnly`: 프로퍼티를 소유 클라이언트에만 복제
- `COND_SkipOwner`: 소유 클라이언트를 제외하고 복제
- PlayerController: 기본적으로 자기 소유 클라이언트에만 관련 있음

예를 들어 비밀 인벤토리는 OwnerOnly가 자연스럽지만 다른 플레이어가 볼 장착 무기 외형까지 OwnerOnly로 만들면 관찰자 화면에 보이지 않는다. 개인 데이터와 공개 표현 데이터를 분리한다.

## 핸드셰이크를 애플리케이션 상태와 구분하기

네트워크 연결 수립에는 버전, 제어 메시지, 로그인과 월드 입장 과정이 있다. 연결이 성립했다고 캐릭터의 모든 게임 데이터가 즉시 준비된 것은 아니다.

```text
Transport/Connection 수립
  ↓ 엔진 제어 메시지와 로그인
PlayerController 생성
  ↓
PlayerState/Pawn 준비
  ↓
게임 데이터 비동기 로드
  ↓
Ready 상태 승인
```

클라이언트가 Ready RPC를 보냈다는 이유만으로 서버 준비 상태를 생략하지 않는다. 서버는 필요한 프로필과 맵 상태가 실제로 준비됐는지 확인하고 시작한다.

## 디버깅 질문

RPC가 실행되지 않을 때 무작정 Reliable로 바꾸기보다 다음을 기록한다.

1. 호출한 Actor가 `bReplicates` 대상인가?
2. 호출 위치의 LocalRole은 무엇인가?
3. Actor의 Owner 체인은 어느 PlayerController로 이어지는가?
4. 해당 클라이언트가 실제 owning connection을 가지는가?
5. Actor가 아직 클라이언트에 생성되기 전이거나 관련성 밖은 아닌가?
6. 실행하고 싶은 것은 Server/Client/Multicast 중 어떤 방향인가?

## 복습 질문

- 게임 디자인상의 아이템 소유자와 네트워크 Owner가 항상 같을 필요가 없는 이유는 무엇인가?
- AutonomousProxy와 SimulatedProxy는 같은 캐릭터를 어떻게 다르게 처리하는가?
- 소유권 없는 Door에서 Client→Server RPC가 실패할 때 어떤 경로로 재설계할 수 있는가?
- `HasAuthority()`와 `IsLocallyControlled()`는 각각 어떤 질문에 답하는가?

## 참고 자료

- [DesignerD: UE 개념정리 - Network](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 액터의 역할과 커넥션 핸드셰이킹](https://meo-young.tistory.com/126)
- [Epic Games: Actor Owner and Owning Connection](https://dev.epicgames.com/documentation/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine)
