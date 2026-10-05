---
title: "언리얼 C++ 공부 06: 월드, 상태 관리와 저장"
description: "모듈과 폴더 구조, 반복되는 맵 구성, 캐릭터 상태 머신, GameMode·PlayerState·SaveGame을 연결해 게임 루프를 완성하는 방법을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Level", "State Machine", "SaveGame"]
featured: false
draft: true
aiGenerated: true
---

개별 기능이 동작한다고 게임이 완성되는 것은 아니다. 캐릭터 생성, 플레이, 사망, 다음 구역 이동, 점수 저장이 하나의 상태 흐름으로 연결되어야 한다. 책의 후반부는 무한히 이어지는 타일형 맵과 캐릭터 상태, 플레이어 데이터 저장을 결합해 작은 게임 루프를 완성한다.

## 프로젝트 구조 정리

클래스가 늘어나면 모든 헤더와 소스가 한 디렉터리에 있는 구조가 빠르게 복잡해진다. 공개 헤더와 내부 구현을 `Public`과 `Private`로 나누고 기능별 하위 디렉터리를 두면 모듈 경계가 보인다.

```text
Source/ArenaGame/
  ├─ ArenaGame.Build.cs
  ├─ Public/
  │   ├─ Character/
  │   ├─ AI/
  │   └─ UI/
  └─ Private/
      ├─ Character/
      ├─ AI/
      └─ UI/
```

디렉터리 이동 뒤에는 IDE 프로젝트 파일을 다시 생성해야 할 수 있다. 헤더 include는 프로젝트의 공개 경계를 반영하도록 정리하고, 다른 모듈이 내부 헤더를 직접 참조하지 않게 한다.

## 반복되는 맵 조각

끝없이 이어지는 길은 거대한 레벨 하나를 만드는 대신 일정 크기의 섹션을 이어 붙이고 지나간 섹션을 제거하는 방식으로 만들 수 있다.

```text
[이전 섹션] [현재 섹션] [다음 섹션]
                 │
          출구 트리거 통과
                 ↓
       새 섹션 스폰 + 오래된 섹션 제거
```

각 섹션은 입구와 출구 Transform을 제공하고, 새 섹션의 입구가 이전 섹션의 출구와 맞도록 배치한다. 생성 규칙에는 다음 항목이 필요하다.

- 같은 섹션이 지나치게 반복되지 않는 선택 정책
- 충돌과 Nav Mesh가 새 구역에서 준비되는 시점
- 플레이어가 되돌아갈 수 있는 거리
- 제거 전 남아 있는 AI, 아이템과 비동기 작업 정리
- 멀티플레이에서 스폰 권한과 참여자별 로딩 완료 처리

많은 액터를 반복해서 생성·파괴하면 CPU, GC와 메모리 할당 비용이 생긴다. 실제 프로파일에서 병목이 확인되면 섹션 또는 자주 쓰는 액터를 풀링하거나 Level Streaming과 World Partition을 검토한다.

## 캐릭터 상태 머신

상태를 여러 bool로 표현하면 `bDead == true`이면서 `bCanAttack == true` 같은 모순이 생길 수 있다. 서로 배타적인 생명주기는 enum 상태로 관리한다.

```cpp
UENUM(BlueprintType)
enum class ECharacterState : uint8
{
    PreInit,
    Loading,
    Ready,
    Dead
};
```

- `PreInit`: 표현과 UI를 숨기고 초기화를 준비한다.
- `Loading`: 선택한 에셋이나 데이터를 불러오며 조작을 막는다.
- `Ready`: 이동, 공격과 피해 처리를 허용한다.
- `Dead`: 충돌과 입력을 끄고 사망 연출 후 다음 흐름을 요청한다.

상태 진입과 이탈 함수를 두면 각 상태가 켜고 끄는 기능을 한곳에서 관리할 수 있다. 상태를 바꾸는 모든 코드가 직접 메시와 충돌을 조작하면 나중에 규칙이 달라졌을 때 누락이 생긴다.

```text
PreInit → Loading → Ready → Dead
              ↑                │
              └── Respawn ─────┘
```

비동기 로딩이 끝난 뒤 객체가 이미 파괴됐거나 다른 상태로 전환되었을 수 있으므로 콜백에서 현재 상태와 객체 유효성을 다시 검사한다.

## GameMode와 PlayerState

GameMode는 점수 조건, 재시작과 새 Pawn 생성 같은 서버 규칙을 맡는다. PlayerState는 점수, 레벨, 플레이어 이름처럼 플레이어와 함께 유지되고 멀티플레이에서 공유될 데이터를 맡는다.

싱글 플레이 실습에서도 이 구분을 지키면 나중에 네트워크로 확장하기 쉽다. 캐릭터 Pawn이 사망해 새 Pawn으로 바뀌어도 PlayerState는 유지될 수 있으므로 점수를 Pawn에만 저장하지 않는다.

## SaveGame은 직렬화할 데이터 계약이다

`USaveGame` 파생 클래스에 저장할 필드를 선언하고 슬롯 이름과 사용자 인덱스로 파일을 저장한다.

```cpp
UCLASS()
class UAdventureSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    int32 HighScore = 0;

    UPROPERTY()
    int32 CharacterLevel = 1;
};
```

```cpp
UAdventureSaveGame* Data = Cast<UAdventureSaveGame>(
    UGameplayStatics::CreateSaveGameObject(UAdventureSaveGame::StaticClass()));

Data->HighScore = CurrentHighScore;
UGameplayStatics::SaveGameToSlot(Data, SlotName, 0);
```

저장 파일은 현재 메모리 객체를 통째로 덤프하는 장치가 아니다. 다시 생성할 수 있는 Actor 포인터 대신 ID, 수치와 명시적인 진행 상태를 저장한다. 버전이 바뀌면 새 필드의 기본값과 이전 형식 마이그레이션도 고려한다.

## 저장 시점과 실패 정책

점수 한 번 변할 때마다 동기 저장하면 디스크 지연이 프레임에 영향을 줄 수 있다. 체크포인트, 스테이지 종료, 안전한 메뉴 구간처럼 의미 있는 시점을 정하고 필요하면 비동기 저장을 사용한다.

저장 중 종료, 디스크 공간 부족, 손상된 파일에 대한 정책도 필요하다.

- 임시 파일에 쓴 뒤 원자적으로 교체할 수 있는가?
- 저장 실패를 사용자에게 알릴 것인가?
- 백업 슬롯을 유지할 것인가?
- 클라우드 저장과 로컬 저장이 충돌하면 무엇을 우선할 것인가?
- 멀티플레이의 권위 데이터는 클라이언트 SaveGame이 아니라 서버 저장소에 있어야 하지 않는가?

## 완성 단계의 점검

기능별 성공 경로만 확인하지 말고 전체 루프를 반복한다.

1. 새 게임에서 기본값으로 시작한다.
2. 전투로 점수와 레벨을 올린다.
3. 사망 후 상태와 UI가 올바르게 초기화된다.
4. 다음 맵으로 이동해 유지할 데이터와 초기화할 데이터가 구분된다.
5. 게임을 종료하고 다시 실행해 저장 데이터가 복구된다.
6. 저장 파일이 없거나 손상돼도 안전한 기본 상태로 시작한다.

## 복습 질문

- 여러 bool 대신 명시적 상태 머신을 사용하면 어떤 모순을 막을 수 있는가?
- Pawn이 파괴돼도 유지되어야 할 데이터는 어디에 두어야 하는가?
- SaveGame에 Actor 포인터보다 식별자와 값이 적합한 이유는 무엇인가?
- 반복 맵에서 섹션 제거 전에 어떤 참조와 비동기 작업을 정리해야 하는가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 이득우 언리얼 C++ 정리](https://wecandev.tistory.com/category/%F0%9F%93%95%20Book/%EC%9D%B4%EB%93%9D%EC%9A%B0%20%EC%96%B8%EB%A6%AC%EC%96%BC%20C%2B%2B)
