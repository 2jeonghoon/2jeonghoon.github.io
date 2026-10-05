---
title: "언리얼 네트워크 공부 03: Actor·Property Replication과 RepNotify"
description: "서버 상태를 클라이언트에 복제하는 기본 원리, DOREPLIFETIME과 RepNotify, 컴포넌트·서브오브젝트 복제와 초기 상태 설계를 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine", "Networking", "Replication", "RepNotify", "Actor"]
featured: false
draft: true
aiGenerated: true
---

Replication은 서버의 메모리를 그대로 복사하는 기능이 아니다. 서버가 각 연결에 대해 관련 있는 Actor를 선택하고, 복제 대상으로 등록된 상태의 변경분을 직렬화해 클라이언트의 대응 Actor에 적용하는 시스템이다. Actor가 복제된다고 모든 변수와 컴포넌트가 자동으로 전달되지는 않는다.

## Actor 복제 활성화

Actor가 네트워크 복제 대상이 되려면 일반적으로 생성자에서 복제를 켠다.

```cpp
AReplicatedChest::AReplicatedChest()
{
    bReplicates = true;
    bReplicateMovement = false;
}
```

`bReplicateMovement`는 Actor의 이동 관련 상태를 복제하지만 모든 게임 상태를 대신하지 않는다. 서버에서 복제 Actor를 스폰하면 관련 있는 클라이언트에 대응 인스턴스가 생성되고, 서버에서 파괴하면 해당 클라이언트에서도 제거된다.

복제 Actor를 클라이언트에서만 스폰하면 서버 원본이 없으므로 다른 참여자에게 전파되지 않는다. 로컬 전용 이펙트처럼 의도적인 경우와 권위 Actor를 구분한다.

## Property Replication

복제할 프로퍼티는 선언과 등록이 모두 필요하다.

```cpp
UPROPERTY(Replicated)
int32 Gold = 0;

void AReplicatedChest::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(AReplicatedChest, Gold);
}
```

서버에서 `Gold`가 바뀌면 복제 시스템이 최신 값을 클라이언트로 보낸다. 프로퍼티 복제는 과거의 모든 중간 값을 이벤트 로그처럼 전달하는 장치가 아니다. 값이 10→20→30으로 빠르게 바뀌면 클라이언트가 20을 관찰하지 못하고 최신 30으로 수렴할 수 있다.

따라서 “현재 문이 열려 있는가”, “현재 체력이 얼마인가” 같은 상태에 적합하다. “총이 발사될 때마다 한 번씩 재생해야 한다” 같은 순간 이벤트는 RPC나 상태 기반 다른 설계를 검토한다.

## RepNotify로 상태 적용 후 처리하기

`ReplicatedUsing`은 새 값이 클라이언트에 적용될 때 함수를 호출해 UI나 표현을 갱신한다.

```cpp
UPROPERTY(ReplicatedUsing = OnRep_Health)
float Health = 100.0f;

UFUNCTION()
void OnRep_Health(float PreviousHealth);

void AStudyCharacter::OnRep_Health(float PreviousHealth)
{
    OnHealthChanged.Broadcast(PreviousHealth, Health);
}
```

서버에서 값을 바꿨을 때 서버의 RepNotify 호출 방식은 엔진 버전과 작성 방식에 따라 클라이언트와 다르게 다뤄질 수 있다. 서버 로직과 클라이언트 표현이 같은 후처리를 필요로 한다면 공통 함수로 분리하고 서버 상태 변경 코드에서도 명시적으로 호출하는 구성이 이해하기 쉽다.

RepNotify는 도착 횟수보다 **현재 상태로 표현을 맞추는 멱등 처리**에 적합하다. 같은 값이 다시 적용되거나 초기 복제와 변경 복제의 순서 차이가 있어도 올바른 화면이 되게 한다.

## 상태를 함께 묶어야 할 때

서로 강하게 연관된 값을 별도 프로퍼티로 복제하면 클라이언트가 잠시 조합 불가능한 중간 상태를 볼 수 있다.

```text
CurrentAmmo = 0 도착
ReloadState = Reloading 아직 미도착
→ UI가 탄약 0인데 재장전 표시가 없는 순간 상태를 볼 수 있음
```

하나의 구조체로 묶거나 상태 전이에 필요한 최소 정보를 한 프로퍼티로 표현하고, RepNotify에서 일관되게 적용한다. 모든 데이터를 한 거대한 구조체로 만드는 것도 변경분을 키우므로 함께 바뀌고 함께 소비되는 경계를 찾는다.

## 조건부 복제

`DOREPLIFETIME_CONDITION`을 사용하면 소유자만, 소유자 제외, 초기 한 번 등 조건에 따라 전송을 줄일 수 있다.

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, PrivateInventory, COND_OwnerOnly);
DOREPLIFETIME_CONDITION(AStudyCharacter, CosmeticState, COND_SkipOwner);
```

조건은 보안 경계의 일부가 될 수 있지만 클라이언트 메모리에 도착한 비밀을 안전하다고 볼 수는 없다. 정말 알 필요 없는 데이터는 보내지 않고, 서버의 규칙 검증은 별도로 유지한다.

## Component와 Subobject

ActorComponent가 복제되려면 소유 Actor가 복제 대상이어야 하고 컴포넌트 자체도 복제 설정이 필요하다.

```cpp
UHealthComponent::UHealthComponent()
{
    SetIsReplicatedByDefault(true);
}
```

일반 UObject는 독립적인 Actor처럼 자동으로 네트워크 채널을 갖지 않는다. 복제되는 Actor의 Subobject로 등록하고 수명과 생성 방식을 관리해야 한다. 인벤토리 항목 수가 많다면 각 항목을 UObject로 무조건 복제하기보다 Fast Array Serialization 같은 변경 목록용 구조를 검토한다.

## 초기 복제와 Late Join

상태를 프로퍼티로 표현하면 늦게 참가한 클라이언트도 현재 값을 받을 수 있다. 과거 Multicast RPC만으로 문 열림이나 보스 사망을 표현하면, RPC가 실행된 뒤 참가한 클라이언트는 현재 상태를 알 수 없다.

```text
지속 상태: Property Replication
  - 문 열림
  - 현재 체력
  - 경기 단계

순간 표현: RPC 또는 로컬 반응
  - 총구 화염
  - 일회성 카메라 흔들림
```

지속 상태와 순간 효과를 함께 쓰는 경우 RepNotify가 현재 상태를 기준으로 필요한 표현을 복구하도록 설계한다.

## 복습 질문

- Property Replication이 과거의 모든 중간 값을 보장하지 않는 이유는 무엇인가?
- RepNotify 함수를 멱등적으로 작성하면 어떤 순서 문제를 줄일 수 있는가?
- 늦게 참가한 클라이언트가 Multicast RPC만으로는 현재 문 상태를 알 수 없는 이유는 무엇인가?
- Component와 일반 UObject의 복제 조건은 어떻게 다른가?

## 참고 자료

- [DesignerD: Actor Replication 시리즈](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 이득우의 언리얼 프로그래밍 Part3 정리](https://meo-young.tistory.com/category/%EA%B0%95%EC%9D%98/%5B%EA%B0%95%EC%9D%98%5D%20%EC%9D%B4%EB%93%9D%EC%9A%B0%EC%9D%98%20%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%B0%8D%20Part3)
- [Epic Games: Replicating Actor Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicating-actor-components-in-unreal-engine)
