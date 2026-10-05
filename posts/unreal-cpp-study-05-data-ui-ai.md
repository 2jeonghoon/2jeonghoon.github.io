---
title: "언리얼 C++ 공부 05: 데이터, UI와 AI"
description: "GameInstance와 DataTable, UMG 위젯, AIController·Blackboard·Behavior Tree를 연결해 데이터 중심 게임플레이를 구성하는 방법을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "DataTable", "UMG", "Behavior Tree"]
featured: false
draft: true
aiGenerated: true
---

캐릭터 수치가 코드 곳곳에 상수로 박혀 있으면 밸런스를 바꿀 때마다 다시 컴파일해야 한다. 화면 위젯이 캐릭터 내부 구현을 직접 알고, AI가 플레이어 클래스를 강하게 참조하면 기능 하나를 고칠 때 여러 시스템이 함께 흔들린다. 이 단계의 핵심은 데이터, 표현, 판단의 책임을 분리하는 것이다.

## DataTable로 정적 데이터 관리하기

언리얼의 DataTable은 `FTableRowBase`를 상속한 구조체를 행 형식으로 사용한다. 캐릭터 레벨별 체력과 공격력처럼 행과 열로 표현하기 좋은 데이터를 CSV나 JSON에서 가져올 수 있다.

```cpp
USTRUCT(BlueprintType)
struct FCharacterStatRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float MaxHP = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Attack = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float ExpToNextLevel = 100.0f;
};
```

행 이름을 레벨 숫자 문자열로만 사용하는 방식은 간단하지만 레벨 외 조건이 늘면 의미가 흐려진다. 안정적인 Row Name 규칙이나 별도 ID 필드를 정하고, 없는 행을 조회했을 때 기본값으로 조용히 진행할지 오류로 중단할지 결정한다.

```cpp
const FCharacterStatRow* Row = StatTable->FindRow<FCharacterStatRow>(
    RowName,
    TEXT("LoadCharacterStat"));

if (Row == nullptr)
{
    UE_LOG(LogTemp, Error, TEXT("Missing stat row: %s"), *RowName.ToString());
    return;
}
```

데이터는 읽은 뒤 검증해야 한다. 체력이 음수이거나 다음 레벨 경험치가 감소하는 것처럼 형식은 맞지만 의미가 잘못된 값도 검출한다.

## GameInstance의 범위

`UGameInstance`는 게임 실행 동안 유지되고 맵 이동에도 살아남는다. 그래서 세션 수준 서비스나 여러 맵이 공유하는 설정에 적합하다. 그러나 모든 전역 데이터를 넣는 저장소로 사용하면 의존성이 숨고 테스트가 어려워진다.

적절한 후보는 다음과 같다.

- 게임 전체 데이터 테이블이나 서비스 접근점
- 로컬 사용자의 세션 정보
- 맵 전환 사이에 유지할 임시 진행 정보

월드에 종속된 상태는 `GameState`나 `WorldSubsystem`, 플레이어별 상태는 `PlayerState`나 `LocalPlayerSubsystem`처럼 수명에 맞는 위치를 검토한다. 멀티플레이에서는 GameInstance가 각 프로세스에 따로 존재하며 자동 복제되지 않는다는 점이 중요하다.

## UMG 위젯과 상태 연결

UI는 체력 값을 직접 결정하지 않고 상태를 표시한다. 매 프레임 바인딩 함수가 캐릭터를 찾아 체력을 읽는 방식은 간단하지만 위젯 수가 늘면 불필요한 호출이 누적된다. 상태 변경 이벤트를 받아 필요한 때만 갱신하는 방식이 비용과 흐름을 이해하기 쉽다.

```text
Character/StatComponent
  └─ OnHealthChanged(Current, Max)
          ↓
       HUD Widget
          ├─ ProgressBar 갱신
          └─ Text 갱신
```

위젯의 `NativeConstruct`에서는 외부 이벤트를 구독하고 `NativeDestruct`에서 구독을 해제한다. 위젯 생성 시점보다 먼저 발생한 상태 변경을 놓치지 않도록 구독 직후 현재 상태도 한 번 읽는다.

```cpp
void UHealthWidget::SetHealth(float Current, float Max)
{
    const float Ratio = Max > 0.0f ? Current / Max : 0.0f;
    HealthBar->SetPercent(FMath::Clamp(Ratio, 0.0f, 1.0f));
}
```

## AIController와 Navigation

AI 캐릭터는 PlayerController 대신 AIController가 빙의한다. 이동 가능한 공간은 Nav Mesh가 표현하고, `MoveTo` 계열 요청은 목적지까지 경로를 찾아 CharacterMovement를 통해 이동한다.

AI가 움직이지 않을 때는 코드보다 먼저 다음을 확인한다.

- Nav Mesh Bounds Volume이 필요한 영역을 덮는가?
- 실행 중 표시한 Nav Mesh가 실제로 생성됐는가?
- Pawn이 AIController를 자동으로 생성하도록 설정됐는가?
- 목표점이 Nav Mesh 위에 있는가?
- 캡슐 크기와 에이전트 설정이 일치하는가?

## Blackboard와 Behavior Tree

Blackboard는 AI 판단에 필요한 공유 키를 저장하고, Behavior Tree는 키를 읽어 행동을 선택한다.

```text
Selector
  ├─ [TargetActor 있음] Sequence
  │      ├─ Move To TargetActor
  │      └─ Attack
  └─ Patrol
         ├─ Find Random Location
         └─ Move To PatrolLocation
```

Service는 일정 주기로 플레이어 탐색이나 거리 계산처럼 Blackboard를 갱신하고, Task는 이동이나 공격 같은 한 작업을 실행한다. Decorator는 거리나 상태 조건으로 가지의 실행 여부를 결정한다.

Task가 비동기 행동을 시작했다면 완료 또는 실패를 명확히 보고해야 한다. 공격 애니메이션이 끝날 때까지 기다리는 Task가 즉시 성공을 반환하면 트리가 다음 행동을 시작해 상태가 겹칠 수 있다. 반대로 완료 통지를 놓치면 트리가 영원히 멈춘다.

## 감지와 공격의 분리

AI가 대상을 찾는 것, 쫓는 것, 공격 가능한지 판정하는 것은 서로 다른 책임이다.

- 감지: AI Perception이나 범위 질의로 후보를 찾는다.
- 선택: 팀, 생존, 우선순위 규칙으로 목표를 정한다.
- 이동: Nav Mesh를 따라 공격 거리까지 접근한다.
- 공격: 쿨다운과 방향, 시야, 현재 상태를 검증한다.

Service에서 매 틱 전체 플레이어를 순회하기보다 감지 이벤트와 적절한 업데이트 주기를 사용한다. 목표 Actor가 파괴되거나 월드를 떠나는 상황도 정상 분기로 처리한다.

## 데이터 참조와 메모리

DataTable의 한 행에 모든 캐릭터 메시, 애니메이션, 사운드를 하드 참조로 넣으면 테이블을 로드하는 순간 큰 에셋 그래프가 함께 로드될 수 있다. 수치처럼 항상 필요한 작은 데이터와 필요할 때 불러올 콘텐츠 참조를 구분한다. 후자는 Soft Object Reference와 Asset Manager를 사용해 로딩 시점을 제어할 수 있다.

## 복습 질문

- DataTable 행을 읽은 뒤 의미 검증이 필요한 이유는 무엇인가?
- GameInstance와 GameState의 수명 및 네트워크 범위는 어떻게 다른가?
- UI 폴링보다 이벤트 갱신이 유리한 상황은 언제인가?
- Behavior Tree Task가 비동기 완료를 정확히 보고하지 않으면 어떤 문제가 생기는가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 게임 데이터와 UI 위젯](https://wecandev.tistory.com/138)
- [코딩 부부: AI 컨트롤러와 비헤이비어 트리](https://wecandev.tistory.com/139)
