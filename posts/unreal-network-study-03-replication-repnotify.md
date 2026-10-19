---
title: "03: Actor·Property Replication과 RepNotify"
description: "서버 상태를 클라이언트에 복제하는 기본 원리, DOREPLIFETIME과 RepNotify, 컴포넌트·서브오브젝트 복제와 초기 상태 설계를 정리합니다."
date: "2026-10-16"
order: 1
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine","Networking","Replication","RepNotify","Actor"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
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

### Replicated 선언과 DOREPLIFETIME 등록

`UPROPERTY(Replicated)`는 `Gold`가 네트워크 복제에 사용할 프로퍼티라는 선언이다. `int32 Gold = 0;`의 `= 0`은 일반적인 C++ 초기값 설정이며, 이 선언 자체가 값을 전송하는 것은 아니다.

`DOREPLIFETIME`은 함수처럼 보이지만 **컴파일 전에 다른 C++ 코드로 펼쳐지는 매크로**다. 다음 코드는 “`AReplicatedChest` 클래스의 `Gold`를 복제 대상 목록에 등록한다”는 뜻이다.

```cpp
DOREPLIFETIME(AReplicatedChest, Gold);
//            클래스 이름       변수 이름
```

위와 같은 C++ 프로퍼티 복제 설정에서는 선언과 등록을 함께 사용한다. `Replicated`로 복제할 변수임을 표시하고, `DOREPLIFETIME`으로 엔진이 사용할 복제 목록에 포함한다. 이 매크로를 실행하는 순간 값을 보내는 것이 아니라, 등록된 정보를 바탕으로 엔진의 복제 시스템이 필요한 시점에 동기화한다.

매크로를 사용하는 `.cpp` 파일에는 다음 헤더가 필요하다.

```cpp
#include "Net/UnrealNetwork.h"
```

### GetLifetimeReplicatedProps의 역할

`GetLifetimeReplicatedProps`는 이 클래스에서 어떤 프로퍼티를 복제할지 엔진에 알려주는 함수다. 헤더의 클래스 선언에는 다음과 같이 오버라이드를 선언한다.

```cpp
virtual void GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const override;
```

함수 안의 각 요소는 다음 역할을 한다.

| 코드 | 역할 |
| --- | --- |
| `OutLifetimeProps` | 복제할 프로퍼티의 정보를 담는 배열 |
| `Super::GetLifetimeReplicatedProps(OutLifetimeProps)` | 부모 클래스의 복제 설정을 포함 |
| `DOREPLIFETIME(AReplicatedChest, Gold)` | 현재 클래스의 `Gold`를 복제 목록에 추가 |
| 함수 끝의 `const` | 이 함수에서 상자 객체 자체의 상태를 변경하지 않음을 표시 |

`OutLifetimeProps`는 `&`로 받은 참조이므로 함수 안에서 추가한 정보가 호출한 쪽의 배열에 반영된다. 함수가 `const`여도 별도로 전달받은 배열은 수정할 수 있다.

여기서 `Lifetime`은 Actor의 복제 채널 수명 동안 사용할 복제 정보라는 맥락이다. 매 프레임 값을 무조건 전송한다는 뜻이 아니다. 또한 프로퍼티를 등록해도 Actor 자체의 복제가 꺼져 있으면 충분하지 않으므로, 앞서 본 생성자의 `bReplicates = true` 설정도 필요하다.

### Gold 값이 동기화되는 흐름

복제는 기본적으로 **서버에서 클라이언트 방향**으로 진행된다.

```text
서버의 상자                        클라이언트의 대응 상자
Gold = 0                           Gold = 0

서버에서 Gold = 100으로 변경
          └── 네트워크 복제 ──────→ Gold = 100
```

클라이언트가 자신의 `Gold`를 변경해도 서버의 값이 자동으로 바뀌지는 않는다. 게임 규칙에 따른 값 변경은 서버에서 처리하고, 클라이언트는 복제된 상태를 받도록 구성한다. 값이 바뀌는 즉시 모든 클라이언트로 전송되는 것도 아니다. 해당 Actor가 연결에 복제될 수 있는지와 네트워크 업데이트 시점 등에 영향을 받는다.

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

### OnRep_Health는 언제 호출되는가?

이 예제에서 `OnRep_Health`는 **서버에서 변경된 `Health`가 클라이언트에 복제되어 적용될 때 클라이언트에서 호출되는 함수**다. 모든 C++ 대입을 감시하는 함수로 이해하면 안 된다.

서버와 클라이언트의 체력이 모두 `100`인 상태에서 서버가 체력을 `80`으로 변경했다고 가정하면 다음 순서로 진행된다.

```text
서버: Health = 80.0f;
    │
    └── 클라이언트로 복제
              ├── 클라이언트의 Health를 80으로 갱신
              └── 클라이언트에서 OnRep_Health(100) 호출
```

함수가 호출될 때 `Health`에는 이미 새 값이 적용되어 있다. 매개변수 `PreviousHealth`에는 복제 적용 전 클라이언트가 가지고 있던 값이 전달된다.

```cpp
void AStudyCharacter::OnRep_Health(float PreviousHealth)
{
    // PreviousHealth = 100.0f: 복제 적용 전 클라이언트의 값
    // Health = 80.0f: 복제 적용 후 현재 값
    OnHealthChanged.Broadcast(PreviousHealth, Health);
}
```

`OnHealthChanged`는 별도로 선언한 델리게이트라고 가정한다. `Broadcast`는 그 델리게이트에 연결된 함수들에 이전 체력과 현재 체력을 전달한다. 체력 UI가 연결되어 있다면 이 알림을 받아 체력바를 갱신할 수 있다. `ReplicatedUsing`이 델리게이트나 UI를 자동으로 만들어 주는 것은 아니다.

`Health`도 앞서 본 `Gold`처럼 `GetLifetimeReplicatedProps`에서 복제 대상으로 등록해야 한다.

```cpp
DOREPLIFETIME(AStudyCharacter, Health);
```

### 직접 대입하면 자동 호출되는가?

C++에서 서버가 `Health = 80.0f;`를 실행해도 그 대입만으로 **서버의 `OnRep_Health`가 자동 호출되지는 않는다**. 이후 값을 복제받은 클라이언트에서 RepNotify가 실행된다. 클라이언트가 로컬에서 `Health`에 직접 대입한 경우에도 그 대입 자체는 RepNotify를 자동 호출하지 않는다.

따라서 `OnRep_Health`는 “모든 체력 변경을 감시하는 함수”보다 “복제로 받은 체력을 UI나 표현에 반영하는 함수”로 이해하는 편이 정확하다. 또한 서버에서 체력이 여러 번 바뀌어도 클라이언트가 모든 중간 값을 받는 것은 아니므로, 서버의 각 변경마다 한 번씩 호출된다고 가정하지 않는다.

서버 로직과 클라이언트 표현이 같은 후처리를 필요로 한다면 공통 함수로 분리하고 서버 상태 변경 코드에서도 명시적으로 호출하는 구성이 이해하기 쉽다. 위 설명은 C++ 직접 대입 기준이며, 블루프린트의 프로퍼티 Set 노드는 RepNotify 호출 동작이 다를 수 있다.

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

`DOREPLIFETIME`이 프로퍼티를 복제 목록에 등록한다면, `DOREPLIFETIME_CONDITION`은 **그 프로퍼티를 어떤 연결에, 어떤 조건으로 보낼지**까지 지정하는 매크로다. 조건에 따라 불필요한 전송을 줄일 수 있다.

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, PrivateInventory, COND_OwnerOnly);
DOREPLIFETIME_CONDITION(AStudyCharacter, CosmeticState, COND_SkipOwner);
```

세 번째 인자가 복제 조건이다. 위 코드는 `GetLifetimeReplicatedProps` 안에서 사용하며, 각 변수에는 앞서 본 `UPROPERTY(Replicated)` 또는 `ReplicatedUsing` 선언이 필요하다. 같은 변수를 일반 `DOREPLIFETIME`과 조건부 매크로로 중복 등록하지 않는다.

### 매크로는 무엇을 등록하는가?

`DOREPLIFETIME_CONDITION`은 함수 호출처럼 보이지만, 컴파일 전에 복제 설정을 등록하는 C++ 코드로 펼쳐지는 매크로다. 각 인자의 의미는 다음과 같다.

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, PrivateInventory, COND_OwnerOnly);
//                     클래스 이름     프로퍼티 이름    복제 조건
```

| 인자 | 의미 |
| --- | --- |
| `AStudyCharacter` | 프로퍼티가 속한 클래스 |
| `PrivateInventory` | 복제할 멤버 변수. 현재 값이 아니라 변수 자체를 지정 |
| `COND_OwnerOnly` | 엔진이 전송 대상을 판단할 때 사용할 조건 |

이 매크로는 `GetLifetimeReplicatedProps`가 받은 `OutLifetimeProps` 배열에 해당 프로퍼티의 복제 정보와 조건을 등록한다. 이 때문에 아래처럼 해당 함수 안에서 사용한다.

```cpp
void AStudyCharacter::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME_CONDITION(
        AStudyCharacter, PrivateInventory, COND_OwnerOnly);
    DOREPLIFETIME_CONDITION(
        AStudyCharacter, CosmeticState, COND_SkipOwner);
}
```

의미상으로는 “이 클래스의 인벤토리는 소유 연결에만, 외형 상태는 소유 연결을 제외하고 복제한다”는 규칙표를 엔진에 제공하는 것이다. 값을 바꿀 때마다 이 함수를 직접 호출하거나 매크로를 다시 실행할 필요는 없다. 등록은 클래스의 복제 구성을 정의하고, 실제 플레이 중에는 엔진이 이 구성을 이용해 연결별 전송 여부를 판단한다. 따라서 이 함수 안에서 `if (현재 체력 > 0)` 같은 인스턴스 상태에 따라 등록 여부를 바꾸는 방식으로 사용하지 않는다.

### 설정한 뒤에는 언제 동기화되는가?

**설정 등록과 실제 전송은 서로 다른 단계**다. 일반적인 프로퍼티 복제 흐름을 개념적으로 정리하면 다음과 같다. 세부 구현과 검사 순서는 사용하는 복제 시스템에 따라 달라질 수 있다.

1. 서버의 게임 로직이 프로퍼티 값을 변경한다.
2. 엔진의 네트워크 업데이트에서 해당 Actor를 복제할 기회가 온다.
3. 연결마다 Actor의 relevancy, dormancy 등 복제 가능 여부와 프로퍼티 조건을 반영한다.
4. 조건을 만족하는 연결에 초기 상태 또는 전달해야 할 변경 상태를 직렬화해 보낸다.
5. 클라이언트가 데이터를 수신해 자신의 대응 Actor 프로퍼티에 적용한다. `ReplicatedUsing`으로 등록했다면 RepNotify 정책에 따라 후처리 함수도 호출한다.

예를 들어 A가 소유한 캐릭터에서 서버가 인벤토리를 변경하면 다음과 같이 처리된다.

```text
① 서버: PrivateInventory에 물약 추가
   → 서버의 메모리 값이 변경됨. 이 대입 자체가 즉시 전송 명령은 아님.

② 이후 엔진의 복제 업데이트
   → A 연결: OwnerOnly 조건 만족 → 필요한 인벤토리 상태 전송
   → B 연결: OwnerOnly 조건 불만족 → 이 프로퍼티 전송 제외

③ A 클라이언트가 수신
   → A가 가진 캐릭터의 PrivateInventory에 적용
   → ReplicatedUsing을 사용했다면 해당 OnRep에서 UI 갱신 가능
```

`COND_OwnerOnly`는 전송 대상을 제한할 뿐, “A가 인벤토리 창을 열 때 전송한다”는 뜻은 아니다. 창이 닫혀 있어도 복제 조건을 만족하면 동기화할 수 있다. `COND_SkipOwner` 역시 같은 흐름에서 소유 연결을 제외하는 조건이다. `COND_InitialOnly`는 해당 연결의 초기 복제에서만 대상이 되고 이후 일반 변경 업데이트에서는 제외된다.

업데이트 간격은 Actor의 `NetUpdateFrequency` 같은 설정에 영향을 받는다. 예를 들어 초당 10회로 설정했다고 해서 변경 후 정확히 0.1초 안에 클라이언트 적용까지 끝난다는 보장은 없다. 서버 틱, 우선순위, 대역폭, 네트워크 지연 등도 영향을 준다. Dormancy로 복제 검사가 중단된 Actor라면 상태 변경에 맞춰 깨우는 처리도 필요할 수 있다. 자세한 흐름은 [Epic Games의 Actor 복제 흐름 문서](https://dev.epicgames.com/documentation/unreal-engine/detailed-actor-replication-flow-in-unreal-engine)를 참고한다.

값이 변하지 않았는데 조건을 만족한다는 이유만으로 매 업데이트마다 같은 값을 계속 보내는 것은 아니다. 반대로 새 클라이언트가 Actor를 처음 복제받을 때는 서버에서 방금 값이 바뀌지 않았어도 조건에 맞는 현재 상태를 받을 수 있다. 전송 전에 값이 여러 번 바뀌면 중간 값이 생략될 수 있다는 점도 일반 프로퍼티 복제와 같다.

### 여기서 소유자란 누구인가?

소유자는 서버를 뜻하는 것이 아니라, **그 Actor의 소유 관계를 통해 연결되는 플레이어의 네트워크 연결(Owning Connection)**을 뜻한다. 서버가 게임 상태를 결정하는 권한과 클라이언트의 소유 연결은 서로 다른 개념이다.

예를 들어 플레이어 A가 조종하는 캐릭터는 보통 A의 PlayerController를 통해 A의 연결과 이어진다. 이 캐릭터에 대한 `COND_OwnerOnly`는 A의 클라이언트에만 보내라는 뜻이다. 같은 캐릭터를 보고 있는 B와 C는 소유자가 아니다. 단순히 Actor를 생성했거나 가까이 있다는 이유로 소유자가 되는 것은 아니며, 소유 연결이 없는 Actor도 있다.

아래 예시는 서버에 A의 캐릭터가 있고, A·B·C 모두 해당 캐릭터를 복제받을 수 있는 상황을 가정한다.

| 등록 방식 | A: 캐릭터 소유자 | B: 다른 플레이어 | C: 다른 플레이어 |
| --- | --- | --- | --- |
| 일반 `DOREPLIFETIME` | 복제 대상 | 복제 대상 | 복제 대상 |
| `COND_OwnerOnly` | 복제 대상 | 제외 | 제외 |
| `COND_SkipOwner` | 제외 | 복제 대상 | 복제 대상 |

이 조건들은 Actor 자체의 복제 가능 여부에 추가로 적용된다. `COND_SkipOwner`라고 해서 거리나 relevancy와 관계없이 모든 접속자에게 Actor와 프로퍼티를 강제로 보내는 것은 아니다. 소유 연결의 의미는 [Epic Games의 Actor Owner and Owning Connection 문서](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-owner-and-owning-connection-in-unreal-engine)에서 확인할 수 있다.

### COND_OwnerOnly: 본인에게만 필요한 정보

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, PrivateInventory, COND_OwnerOnly);
```

`PrivateInventory`가 가방 안의 전체 아이템 목록이라고 가정하자. 서버가 A의 가방에 물약을 추가하면 A는 자신의 인벤토리 UI를 갱신하기 위해 새 목록을 받아야 한다. B와 C는 A의 가방 내부 목록까지 알 필요가 없으므로 이 프로퍼티를 받지 않는다.

```text
서버: A의 PrivateInventory에 물약 추가
    ├── A에게 복제 → 본인 인벤토리 UI 갱신
    ├── B에게는 보내지 않음
    └── C에게는 보내지 않음
```

다른 사람이 봐야 하는 장착 무기의 외형은 별도의 공개 프로퍼티로 복제할 수 있다. 가방 전체 목록과 남에게 보여줄 장착 상태를 나누면 필요한 정보만 전달하기 쉽다.

### COND_SkipOwner: 본인을 제외하고 전달할 정보

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, CosmeticState, COND_SkipOwner);
```

이 코드는 A 캐릭터의 `CosmeticState`를 B와 C에 보내고 A에게는 보내지 않는다. 예를 들어 A가 입력 즉시 로컬에서 조준 자세를 표시하고, 서버가 확정한 조준 상태를 다른 플레이어에게 전달하는 설계에서 사용할 수 있다.

다만 **소유자가 이미 표시하고 있다는 사실만으로 무조건 제외해도 되는 것은 아니다**. 서버가 입력을 거부하거나 상태를 다르게 결정했을 때 A의 화면을 바로잡을 별도 경로가 필요하다. `COND_SkipOwner`는 그 보정 기능을 만들어 주지 않는다. 소유자도 서버의 최종 값을 받아야 한다면 일반 복제를 사용하는 편이 맞다.

### COND_InitialOnly: 처음 복제할 때 전달할 정보

```cpp
DOREPLIFETIME_CONDITION(AStudyCharacter, AppearanceSeed, COND_InitialOnly);
```

`AppearanceSeed`가 생성 시 정하고 이후 바꾸지 않는 외형 생성용 값이라고 가정하자. 이 조건은 해당 Actor를 클라이언트에 처음 복제하는 초기 데이터 묶음에서만 전송을 시도한다. 이후 같은 복제 채널에서 값이 바뀌어도 계속 갱신해 주지 않으므로 체력처럼 변하는 상태에는 적합하지 않다.

“서버가 게임 전체에서 딱 한 번 보낸다”는 뜻은 아니다. 나중에 참가한 B가 Actor를 처음 복제받으면 B에게도 초기 상태가 전달된다. Actor의 복제 채널이 닫혔다가 다시 생성되는 경우에도 초기 복제가 다시 일어날 수 있다. 각 조건의 정의는 [Epic Games의 프로퍼티 복제 문서](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicate-actor-properties-in-unreal-engine)를 참고한다.

### 보내지 않는 것과 화면에 숨기는 것은 다르다

“조건이 보안 경계의 일부가 된다”는 말은 **알 필요 없는 클라이언트에 데이터를 전달하지 않는 것이 정보 노출을 줄인다**는 뜻이다. 예를 들어 상대의 가방 목록을 B에게 전송한 뒤 UI에서만 숨기면, 데이터는 이미 B의 프로그램 메모리에 존재한다. 클라이언트 프로그램이 변조되면 숨겨 둔 값을 읽을 수 있으므로 UI에 표시하지 않는 것만으로 비밀을 지킬 수 없다.

`COND_OwnerOnly`는 A의 가방 목록을 B와 C에게 보내지 않는 데 도움이 된다. 그러나 A에게 전달한 값까지 A로부터 숨겨 주지는 않는다. 또한 이전에 보낸 데이터를 나중에 조건을 바꿨다고 클라이언트 메모리에서 자동으로 지우거나 회수하는 것도 아니다.

정보를 받을 대상과 행동을 허용할지는 별도로 판단해야 한다. A가 자신의 인벤토리를 볼 수 있어도 “물약을 사용했다”는 요청을 서버가 그대로 믿어서는 안 된다. 서버는 실제 물약 보유 수량과 사용 가능한 상태를 확인한 뒤 수량과 체력을 변경해야 한다. 복제 조건은 **서버 → 클라이언트로 무엇을 보낼지** 정하며, 클라이언트 요청의 유효성을 검증하는 기능은 아니다.

## Component와 Subobject

ActorComponent가 복제되려면 소유 Actor가 복제 대상이어야 하고 컴포넌트 자체도 복제 설정이 필요하다.

```cpp
UHealthComponent::UHealthComponent()
{
    SetIsReplicatedByDefault(true);
}
```

### SetIsReplicatedByDefault(true)는 무엇을 하는가?

`SetIsReplicatedByDefault`는 매크로가 아니라 `UActorComponent`가 제공하는 함수다. `true`를 전달하면 **이 컴포넌트의 복제를 기본적으로 활성화한다**. 내부적으로 컴포넌트의 `bReplicates` 값을 설정하며, 컴포넌트 생성자에서 사용한다.

위 예제는 “`UHealthComponent`는 기본적으로 복제 기능을 사용하는 컴포넌트다”라는 설정이다. 이름의 `ByDefault`는 생성 시의 기본 설정이라는 뜻이며, 초기 상태를 한 번만 보내는 `COND_InitialOnly`와는 다르다. 함수가 실행되는 순간 체력 값이나 컴포넌트 전체 메모리를 전송하는 것도 아니다.

[공식 API 문서](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UActorComponent/SetIsReplicatedByDefault)는 이 함수를 컴포넌트 생성 중에만 호출하도록 명시한다. 이미 생성된 컴포넌트의 복제 여부를 실행 중에 바꾸려면 `SetIsReplicated(true)` 또는 `SetIsReplicated(false)`를 사용한다.

### Actor, Component, Property 설정은 각각 필요하다

캐릭터의 체력 컴포넌트에서 `Health`를 복제하려면 세 단계의 설정을 구분한다.

| 설정 | 의미 |
| --- | --- |
| Actor의 `bReplicates = true` | 소유 Actor를 네트워크 복제 대상으로 설정 |
| Component 생성자의 `SetIsReplicatedByDefault(true)` | 해당 컴포넌트의 복제를 기본 활성화 |
| Component의 `UPROPERTY(Replicated)`와 `DOREPLIFETIME` | 컴포넌트 안에서 어떤 변수를 동기화할지 지정 |

예를 들어 Actor 생성자에서는 체력 컴포넌트를 기본 서브오브젝트로 생성할 수 있다. `HealthComponent`는 클래스에 선언한 멤버라고 가정한다.

```cpp
AStudyCharacter::AStudyCharacter()
{
    bReplicates = true;
    HealthComponent = CreateDefaultSubobject<UHealthComponent>(
        TEXT("HealthComponent"));
}
```

컴포넌트에서는 복제를 활성화하고, 복제할 체력 프로퍼티도 별도로 선언·등록한다.

```cpp
// UHealthComponent 클래스 선언 안
UPROPERTY(Replicated)
float Health = 100.0f;

virtual void GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const override;
```

```cpp
// .cpp 파일: Net/UnrealNetwork.h 포함 필요
UHealthComponent::UHealthComponent()
{
    SetIsReplicatedByDefault(true);
}

void UHealthComponent::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(UHealthComponent, Health);
}
```

`SetIsReplicatedByDefault(true)`만 호출했다고 모든 멤버 변수가 자동 복제되지는 않는다. `Health`를 컴포넌트가 가지고 있으므로 `DOREPLIFETIME`의 클래스 인자도 `AStudyCharacter`가 아닌 `UHealthComponent`다. UI 후처리가 필요하다면 이 프로퍼티에도 `ReplicatedUsing`과 OnRep를 사용할 수 있다.

### 언제, 어떤 경로로 동기화되는가?

서버가 체력 컴포넌트의 `Health`를 바꾸면, 이후 소유 Actor의 복제 업데이트를 통해 클라이언트의 대응 컴포넌트에 값이 적용된다. 컴포넌트가 독립적인 Actor처럼 별도의 네트워크 채널과 업데이트 주기를 갖는 것은 아니다. 소유 Actor의 relevancy와 dormancy 등 복제 상태에 영향을 받는다.

```text
서버의 AStudyCharacter                  클라이언트의 대응 캐릭터
  └─ HealthComponent                     └─ HealthComponent
       Health = 100                           Health = 100

서버에서 컴포넌트의 Health를 80으로 변경
  └── 소유 Actor의 복제 업데이트 ──────────→ Health = 80 적용
```

생성자에서 `CreateDefaultSubobject`로 만든 기본 컴포넌트는 서버와 클라이언트가 각자의 Actor 생성 과정에서 만든다. 컴포넌트 복제를 활성화하는 목적은 이렇게 대응하는 컴포넌트 사이에서 필요한 상태 등을 동기화하는 것이다. 서버에서 실행 중 동적으로 생성하는 컴포넌트는 생성·삭제 복제까지 고려해야 하므로 기본 컴포넌트와 생성 경로를 구분한다. 구체적인 설정은 [Epic Games의 컴포넌트 복제 문서](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicating-actor-components-in-unreal-engine)를 참고한다.

### 일반 UObject Subobject와의 차이

일반 UObject는 독립적인 Actor처럼 자동으로 네트워크 채널을 갖지 않는다. `SetIsReplicatedByDefault`도 모든 UObject에 제공되는 함수가 아니라 ActorComponent의 함수다. 일반 UObject를 복제하려면 복제되는 Actor 또는 컴포넌트의 Subobject로 등록하고 수명과 생성 방식을 관리해야 한다. 인벤토리 항목 수가 많다면 각 항목을 UObject로 무조건 복제하기보다 Fast Array Serialization 같은 변경 목록용 구조를 검토한다.

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

- `UPROPERTY(Replicated)`와 `DOREPLIFETIME`의 역할은 각각 무엇인가?
- `DOREPLIFETIME`을 실행하면 그 순간 값이 전송되는가?
- Property Replication이 과거의 모든 중간 값을 보장하지 않는 이유는 무엇인가?
- C++에서 서버의 `Health`를 직접 변경했을 때 RepNotify는 어디서 호출되는가?
- `OnRep_Health`의 `PreviousHealth`와 현재 `Health`는 각각 어떤 값인가?
- RepNotify 함수를 멱등적으로 작성하면 어떤 순서 문제를 줄일 수 있는가?
- 늦게 참가한 클라이언트가 Multicast RPC만으로는 현재 문 상태를 알 수 없는 이유는 무엇인가?
- Component와 일반 UObject의 복제 조건은 어떻게 다른가?

## 참고 자료

- [Epic Games: Replicate Actor Properties](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicate-actor-properties-in-unreal-engine)
- [Epic Games: UObject::GetLifetimeReplicatedProps](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/CoreUObject/UObject/GetLifetimeReplicatedProps)
- [DesignerD: Actor Replication 시리즈](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 이득우의 언리얼 프로그래밍 Part3 정리](https://meo-young.tistory.com/category/%EA%B0%95%EC%9D%98/%5B%EA%B0%95%EC%9D%98%5D%20%EC%9D%B4%EB%93%9D%EC%9A%B0%EC%9D%98%20%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%B0%8D%20Part3)
- [Epic Games: Replicating Actor Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicating-actor-components-in-unreal-engine)
