---
title: "01: 프로젝트, 액터와 게임플레이 프레임워크"
description: "언리얼 C++ 프로젝트의 폴더와 모듈 구조, 액터 생명주기, 컴포넌트 구성, GameMode 중심의 게임플레이 프레임워크를 정리합니다."
date: "2026-10-12"
order: 4
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine","C++","Actor","Gameplay Framework"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
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

## 언리얼 빌드 시스템의 전체 흐름

언리얼은 Visual Studio의 `.sln`이나 Xcode 프로젝트를 빌드 규칙의 원본으로 사용하지 않는다. **Unreal Build Tool(UBT)** 이 `.uproject`, `Target.cs`, 각 모듈의 `Build.cs`를 읽고 현재 플랫폼과 구성에 맞는 컴파일 환경을 만든다. IDE 프로젝트 파일은 이 정보를 바탕으로 생성되는 편집용 산출물이므로 소스 파일을 추가하거나 모듈 구성이 바뀌었을 때 다시 생성할 수 있다.

```text
.uproject
    │
    ├─ <Project>.Target.cs / <Project>Editor.Target.cs
    │       └─ 무엇을 어떤 형태로 빌드할지 선택
    │
    └─ Source/<Module>/<Module>.Build.cs
            └─ 모듈 의존성과 컴파일 환경 정의
                    │
                    ▼
          Unreal Build Tool (UBT)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
 Unreal Header Tool     C++ 컴파일러·링커
 리플렉션 코드 생성      오브젝트·바이너리 생성
```

일반적인 빌드는 다음 순서로 이해할 수 있다.

1. UBT가 빌드할 Target, 플랫폼과 Configuration을 결정한다.
2. Target에 포함된 모듈과 각 `Build.cs`의 의존성을 계산한다.
3. 리플렉션 매크로가 있는 헤더가 변경됐다면 UHT를 실행해 generated code를 만든다.
4. 플랫폼의 C++ 컴파일러와 링커를 호출해 실행 파일이나 모듈 바이너리를 만든다.

따라서 IDE에서 Build를 눌러도 실제 빌드 그래프를 결정하는 주체는 UBT다. `.sln`에 파일이 보인다는 사실만으로 모듈 의존성이 연결된 것은 아니며, 반대로 생성된 IDE 파일을 지워도 원본 규칙이 남아 있으면 다시 만들 수 있다.

## Target.cs는 빌드 결과물을 선택한다

`Target.cs`는 프로젝트 전체에서 **어떤 종류의 프로그램을 만들 것인지** 정의한다. UBT는 C#으로 작성된 `TargetRules` 클래스를 읽어 Target 종류와 포함할 모듈을 결정한다.

```csharp
using UnrealBuildTool;
using System.Collections.Generic;

public class ArenaGameTarget : TargetRules
{
    public ArenaGameTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        ExtraModuleNames.Add("ArenaGame");
    }
}

public class ArenaGameEditorTarget : TargetRules
{
    public ArenaGameEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        ExtraModuleNames.Add("ArenaGame");
    }
}
```

Target과 Configuration은 서로 다른 축이다. `Editor`는 무엇을 만들지, `Development`는 어느 정도의 최적화와 디버깅 기능을 사용할지 나타낸다. 그래서 `Development Editor`, `DebugGame Editor`, `Development Game`처럼 조합한다.

| Target | 결과와 용도 |
| --- | --- |
| `Game` | Cook된 콘텐츠를 사용하는 독립 실행 게임 |
| `Editor` | 프로젝트 모듈을 포함한 언리얼 에디터 |
| `Client` | 네트워크 게임에서 서버 코드를 제외한 클라이언트 |
| `Server` | 렌더링 등 클라이언트 코드를 제외한 전용 서버 |
| `Program` | 엔진 위에서 동작하는 독립 유틸리티 |

| Configuration | 특징 |
| --- | --- |
| `Debug` | 엔진과 게임 코드를 디버깅 중심으로 빌드하며 가장 느림 |
| `DebugGame` | 엔진은 최적화된 상태로 두고 게임 코드 디버깅에 집중 |
| `Development` | 대부분의 최적화를 사용하며 일반 개발과 에디터 작업의 기본값 |
| `Test` | Shipping에 가까운 최적화를 사용하면서 일부 통계·프로파일링 기능 유지 |
| `Shipping` | 배포 성능에 맞춰 최적화하고 불필요한 콘솔 명령과 개발 기능 제거 |

구성 이름만 보고 디버그 심볼의 존재 여부를 단정해서는 안 된다. 심볼 생성과 패키지 포함 여부는 빌드 방식과 Packaging 설정의 영향을 받으므로 배포 파이프라인에서 별도로 확인한다.

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

`Target.cs`와 `Build.cs`의 책임을 섞지 않는 것이 중요하다.

```text
Target.cs  → 최종 프로그램의 종류와 포함할 모듈 결정
Build.cs   → 한 모듈이 공개·비공개로 의존하는 모듈과 라이브러리 결정
```

예를 들어 전용 서버 실행 파일을 추가하는 일은 `Server.Target.cs`의 책임이고, 게임 모듈에서 `AIModule`을 사용하도록 연결하는 일은 게임 모듈의 `Build.cs` 책임이다. Public 헤더가 다른 모듈의 타입을 노출하면 `PublicDependencyModuleNames`, 구현 파일에서만 사용하면 `PrivateDependencyModuleNames`를 우선 검토한다. 불필요한 Public 의존성은 다른 모듈의 재컴파일 범위를 키울 수 있다.

## 빌드 오류는 발생 단계를 구분한다

같은 “빌드 실패”라도 원인에 따라 확인할 파일이 다르다.

| 실패 단계 | 자주 보이는 원인 | 먼저 확인할 곳 |
| --- | --- | --- |
| UBT 규칙 평가 | 잘못된 Target/Module 이름, `Build.cs` 문법, 누락된 모듈 | 오류에 표시된 `.Target.cs`, `.Build.cs` |
| UHT 코드 생성 | 잘못된 리플렉션 매크로, 지원하지 않는 `UPROPERTY` 타입, `generated.h` 위치 | 오류가 가리키는 헤더와 첫 UHT 메시지 |
| C++ 컴파일 | 선언 오류, include 누락, API 매크로 문제 | 첫 compiler error와 translation unit |
| 링크 | 모듈 의존성 누락, 구현 없는 함수, 라이브러리 설정 오류 | unresolved external symbol과 소유 모듈 |

마지막에 출력된 연쇄 오류보다 **처음 발생한 UBT·UHT·compiler 오류**를 먼저 읽는다. 리플렉션 선언이나 모듈 구조를 바꾼 뒤 Live Coding 결과가 이상하다면 에디터를 종료하고 전체 빌드로 재현해 generated code와 로드된 바이너리 상태를 분리한다.

## Build와 Cook, Package는 다르다

Build는 C++ 소스를 플랫폼 바이너리로 컴파일하고 링크하는 과정이다. Cook은 에디터용 원본 에셋을 목표 플랫폼이 읽을 수 있는 형식으로 변환하고, Stage는 배포할 파일을 임시 디렉터리에 모으며, Package는 바이너리와 Cook된 콘텐츠, 설정과 필요한 런타임 파일을 배포 가능한 구조로 만든다.

```text
Build   → 코드 바이너리 생성
Cook    → 콘텐츠를 대상 플랫폼 형식으로 변환
Stage   → 배포할 파일을 임시 디렉터리에 모음
Package → 실행 가능한 배포 결과물 생성
```

따라서 `Development Game` 빌드로 실행 파일을 만들었더라도 필요한 Cooked Content가 없으면 독립 실행에 실패할 수 있다. 반대로 블루프린트 전용 변경처럼 C++ 컴파일이 필요 없는 작업도 패키징 과정에서는 Cook과 Stage가 필요하다.

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

- `Target.cs`와 `Build.cs`는 각각 빌드의 어떤 결정을 담당하는가?
- `Development Editor`에서 두 단어는 각각 무엇을 의미하는가?
- C++ 빌드가 성공했는데 독립 실행 파일이 콘텐츠를 찾지 못한다면 어떤 단계를 확인해야 하는가?
- 생성자와 `BeginPlay`에 넣어야 할 로직은 어떻게 구분하는가?
- `GameMode`와 `GameState`에 같은 경기 데이터를 중복 저장하면 어떤 문제가 생기는가?
- C++ 기반 클래스와 블루프린트 자식 클래스 사이에 어떤 설정을 공개할 것인가?
- 모든 액터에서 `Tick`을 켜는 설계가 확장될 때 어떤 비용이 생기는가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [딩굴딩굴고양이: 언리얼 빌드 시스템 + Target.cs](https://kyoun.tistory.com/121)
- [코딩 부부: 이득우 언리얼 C++ 정리](https://wecandev.tistory.com/category/%F0%9F%93%95%20Book/%EC%9D%B4%EB%93%9D%EC%9A%B0%20%EC%96%B8%EB%A6%AC%EC%96%BC%20C%2B%2B)
- [Epic Games: Unreal Build Tool](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-build-tool-in-unreal-engine)
- [Epic Games: UBT Target Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-build-tool-target-reference)
- [Epic Games: Build Configurations Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configurations-reference-for-unreal-engine)
- [Epic Games: Unreal Header Tool](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-header-tool-for-unreal-engine)
- [Epic Games: Packaging Your Project](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project)
- [Unreal Engine Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)
