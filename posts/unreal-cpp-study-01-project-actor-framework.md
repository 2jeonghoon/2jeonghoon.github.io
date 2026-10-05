---
title: "언리얼 C++ 공부 01: 프로젝트, 액터와 게임플레이 프레임워크"
description: "언리얼 C++ 프로젝트의 폴더와 모듈 구조, 액터 생명주기, 컴포넌트 구성, GameMode 중심의 게임플레이 프레임워크를 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Actor", "Gameplay Framework"]
featured: false
draft: true
aiGenerated: true
---

『이득우의 언리얼 C++ 게임 개발의 정석』은 작은 액터를 만든 뒤 폰, 캐릭터, 애니메이션, 전투와 AI를 차례로 결합해 하나의 게임을 완성하는 방식으로 언리얼의 구조를 설명한다. 첫 단계에서 중요한 것은 에디터 조작을 외우는 일이 아니라 **에디터에서 만든 콘텐츠와 C++ 모듈이 어떤 경계로 연결되는지** 이해하는 것이다.

책은 Unreal Engine 4.19를 기준으로 작성되었고 참고한 실습 기록은 4.27을 사용한다. 이 글은 그 학습 순서를 따르되 UE5에서도 유지되는 개념을 중심으로 정리한다. 메뉴 위치, 기본 템플릿, 입력 시스템과 일부 API는 버전에 따라 다를 수 있다.

## 프로젝트를 구성하는 디렉터리

언리얼 프로젝트 루트에는 다음 파일과 디렉터리가 만들어진다.

- `Config`: 프로젝트와 플랫폼 설정을 담는다.
- `Content`: 맵, 블루프린트, 메시, 애니메이션 같은 에셋을 저장한다.
- `Source`: 게임 모듈의 C++ 소스와 빌드 규칙을 둔다.
- `Binaries`: 컴파일된 모듈이 놓인다.
- `Intermediate`: 생성된 프로젝트 파일과 중간 빌드 산출물을 둔다.
- `Saved`: 로그, 자동 저장, 크래시 정보처럼 실행 중 생성된 데이터를 둔다.
- `.uproject`: 프로젝트가 사용할 모듈과 플러그인, 엔진 연결 정보를 기술한다.

`Binaries`, `Intermediate`, 일부 `Saved` 내용은 다시 생성할 수 있지만 `Content`, `Config`, `Source`, `.uproject`는 프로젝트의 원본이다. 문제가 생겼다고 모든 디렉터리를 무작정 지우기보다 어떤 단계의 산출물인지 구분해야 한다.

## 모듈과 빌드 규칙

언리얼 C++ 코드는 일반 실행 파일 하나로만 구성되지 않는다. 프로젝트 이름의 게임 모듈이 엔진 모듈을 의존하고, Unreal Build Tool이 `<ModuleName>.Build.cs`의 규칙을 읽어 include 경로와 링크 대상을 정한다.

```csharp
public class ArenaGame : ModuleRules
{
    public ArenaGame(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core", "CoreUObject", "Engine", "InputCore"
        });
    }
}
```

외부에 공개할 선언은 `Public`, 구현 세부는 `Private`에 배치하는 방식이 일반적이다. 작은 게임에서는 한 디렉터리로도 동작하지만 모듈이 커질수록 공개 API와 내부 구현의 경계를 정리하는 편이 빌드 의존성을 이해하기 쉽다.

헤더에 `UCLASS`, `USTRUCT`, `UENUM`, `UPROPERTY`, `UFUNCTION` 같은 리플렉션 매크로가 있으면 Unreal Header Tool이 엔진용 메타데이터와 연결 코드를 생성한다. 그래서 언리얼 클래스 파일을 단순히 파일 탐색기에서 복사하거나 이름만 바꾸면 생성 코드와 클래스 정보가 어긋날 수 있다.

## 액터는 월드에 존재하는 단위다

`AActor`는 월드에 배치되거나 런타임에 스폰될 수 있는 기본 단위다. 시각 요소, 충돌, 오디오처럼 실제 기능은 대개 컴포넌트로 조립한다.

```cpp
AMovingPlatform::AMovingPlatform()
{
    PrimaryActorTick.bCanEverTick = true;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(SceneRoot);

    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    Mesh->SetupAttachment(SceneRoot);
}
```

생성자에서는 기본 서브오브젝트와 클래스 기본값을 구성한다. 플레이 중 월드 상태를 요구하는 로직은 생성자보다 `BeginPlay` 이후가 안전하다. 매 프레임 호출되는 `Tick`은 편리하지만 액터가 많아지면 비용이 누적되므로 변화가 있을 때만 처리할 수 있는 타이머, 이벤트, 컴포넌트 콜백도 고려한다.

```text
생성자
  ↓ 클래스 기본값과 기본 컴포넌트 구성
PostInitializeComponents
  ↓ 컴포넌트 초기화 완료
BeginPlay
  ↓ 게임 플레이 시작
Tick / 이벤트
  ↓
EndPlay
```

정확한 전체 생명주기는 스폰 방식과 에디터 실행 방식에 따라 더 많은 단계가 있지만, 생성자와 플레이 시작 시점을 분리하는 원칙은 변하지 않는다.

## C++ 클래스와 블루프린트의 역할 분담

C++은 규칙과 재사용 가능한 기반을 만들고 블루프린트는 에셋 선택과 수치 조정, 연출 조합을 담당하도록 나누면 협업하기 쉽다. 예를 들어 C++ 액터가 `UStaticMeshComponent`와 이동 로직을 제공하고, 이를 상속한 블루프린트가 실제 메시와 속도를 지정할 수 있다.

```cpp
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
float MoveSpeed = 150.0f;
```

모든 멤버를 블루프린트에 공개하면 편해 보이지만 불변식을 지키기 어려워진다. 디자이너가 조절해야 하는 값과 코드만 바꿔야 하는 상태를 구분하고, 읽기 전용 노출이나 범위 메타데이터를 활용한다.

## GameMode가 게임 규칙을 선택한다

게임플레이 프레임워크의 주요 클래스는 책임이 다르다.

| 클래스 | 핵심 책임 |
| --- | --- |
| `GameMode` | 규칙, 기본 Pawn·Controller·HUD 선택, 플레이어 입장 처리 |
| `GameState` | 참여자가 알아야 하는 경기 전체 상태 |
| `PlayerController` | 한 플레이어의 입력과 화면, 소유 연결의 중심 |
| `PlayerState` | 플레이어 이름, 점수처럼 다른 참여자와 공유할 상태 |
| `Pawn` | Controller가 빙의해 조종할 월드 객체 |
| `Character` | 캡슐, 스켈레탈 메시와 CharacterMovement가 결합된 Pawn |

싱글 플레이에서는 구분이 과해 보일 수 있지만 멀티플레이로 확장하면 의미가 분명해진다. `GameMode`는 서버에만 존재하고, 공유되어야 할 경기 정보는 `GameState`에 둔다. 개인 입력은 `PlayerController`, 다른 사용자도 알아야 하는 점수는 `PlayerState`에 두는 식이다.

```cpp
AAdventureGameMode::AAdventureGameMode()
{
    DefaultPawnClass = AAdventureCharacter::StaticClass();
    PlayerControllerClass = AAdventurePlayerController::StaticClass();
}
```

클래스 선택을 C++에 고정할 수도 있지만, 기반 C++ 클래스를 상속한 GameMode 블루프린트에서 에셋 기반 클래스를 연결하면 코드와 콘텐츠의 결합을 낮출 수 있다. 프로젝트 기본 맵과 GameMode, 맵별 재정의가 서로 다를 수 있으므로 의도한 모드가 적용됐는지 먼저 확인한다.

## UE5에서 확인할 차이

- 새 프로젝트는 Enhanced Input을 사용하는 경우가 많다. 책의 `ActionMappings`, `AxisMappings` 예제를 그대로 옮기기보다 Input Action과 Input Mapping Context 구조를 확인한다.
- 원시 `UObject*` 멤버 대신 `TObjectPtr<T>`가 사용되는 엔진 버전과 프로젝트 설정이 있다.
- 예전 튜토리얼의 `ConstructorHelpers` 경로 고정은 빠른 실습에는 유용하지만 대규모 프로젝트에서는 Soft Object Reference나 Asset Manager가 더 적합할 수 있다.
- 에디터의 Live Coding은 구현 변경에 편리하지만 리플렉션 선언과 클래스 구조가 크게 바뀌면 에디터를 닫고 전체 빌드하는 편이 안전하다.

## 복습 질문

- 생성자와 `BeginPlay`에 넣어야 할 로직은 어떻게 구분하는가?
- `GameMode`와 `GameState`에 같은 경기 데이터를 중복 저장하면 어떤 문제가 생기는가?
- C++ 기반 클래스와 블루프린트 자식 클래스 사이에 어떤 설정을 공개할 것인가?
- 모든 액터에서 `Tick`을 켜는 설계가 확장될 때 어떤 비용이 생기는가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 이득우 언리얼 C++ 정리](https://wecandev.tistory.com/category/%F0%9F%93%95%20Book/%EC%9D%B4%EB%93%9D%EC%9A%B0%20%EC%96%B8%EB%A6%AC%EC%96%BC%20C%2B%2B)
- [Unreal Engine Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)
