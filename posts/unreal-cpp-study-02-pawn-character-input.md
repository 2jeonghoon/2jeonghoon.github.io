---
title: "언리얼 C++ 공부 02: 폰, 캐릭터와 입력"
description: "Pawn과 Character, Controller의 관계를 이해하고 컴포넌트 조립, 이동과 회전, 카메라, UE5 Enhanced Input의 흐름을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Pawn", "Character", "Enhanced Input"]
featured: false
draft: true
aiGenerated: true
---

월드에 존재하는 액터가 모두 플레이어에게 조종되는 것은 아니다. 언리얼은 **보이는 몸체와 판단 주체를 분리**하기 위해 Pawn과 Controller를 사용한다. 같은 캐릭터라도 플레이어 컨트롤러가 빙의하면 사용자 입력으로 움직이고, AI 컨트롤러가 빙의하면 행동 트리의 판단으로 움직일 수 있다.

## Pawn과 Controller

`APawn`은 Controller가 소유할 수 있는 액터다. Controller는 입력이나 의사결정을 담당하고 Pawn은 위치, 충돌, 시각 표현과 실제 행동을 담당한다.

```text
PlayerController ── Possess ──> Pawn
       │                         ├─ Collision
       │ 입력                    ├─ Mesh
       └────────────────────────>├─ Movement
                                 └─ Camera
```

`Possess`와 `UnPossess`를 통해 조종 대상을 바꿀 수 있으므로 사망 후 관전 카메라로 전환하거나 차량에 탑승하는 기능도 같은 모델로 표현할 수 있다. 입력을 Pawn에만 몰아넣기보다 UI·메뉴처럼 몸체와 무관한 입력은 PlayerController에 둘 수 있다.

## 컴포넌트로 폰 조립하기

사람형 폰에는 보통 다음 요소가 필요하다.

- 루트 충돌체: 월드와 충돌하는 기준
- 스켈레탈 메시: 뼈대와 애니메이션을 가진 외형
- 이동 컴포넌트: 속도와 가속, 충돌을 반영해 위치를 갱신
- 스프링 암과 카메라: 충돌 회피와 시점 구성

직접 `APawn`을 조립하면 각 컴포넌트의 역할을 배울 수 있지만 사람형 캐릭터라면 `ACharacter`가 더 적합하다. `ACharacter`는 캡슐, 메시와 `UCharacterMovementComponent`를 이미 제공하며 걷기, 점프, 낙하, 네트워크 이동 같은 복잡한 규칙을 포함한다.

```cpp
AStudyCharacter::AStudyCharacter()
{
    SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
    SpringArm->SetupAttachment(GetCapsuleComponent());
    SpringArm->TargetArmLength = 400.0f;
    SpringArm->bUsePawnControlRotation = true;

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(SpringArm);
    Camera->bUsePawnControlRotation = false;
}
```

스프링 암이 컨트롤러 회전을 사용하고 카메라는 암의 결과를 따르게 하면, 카메라가 캐릭터 회전에 무조건 고정되지 않는 3인칭 시점을 만들 수 있다.

## 입력을 월드 방향으로 바꾸기

앞으로 이동한다는 말은 카메라 시점에 따라 달라진다. 입력 벡터를 그대로 월드 X축에 더하지 말고 Controller의 Yaw를 기준으로 전방과 오른쪽 방향을 구한다.

```cpp
void AStudyCharacter::Move(const FVector2D& Value)
{
    if (Controller == nullptr)
        return;

    const FRotator Rotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    const FVector Forward = FRotationMatrix(Rotation).GetUnitAxis(EAxis::X);
    const FVector Right = FRotationMatrix(Rotation).GetUnitAxis(EAxis::Y);

    AddMovementInput(Forward, Value.Y);
    AddMovementInput(Right, Value.X);
}
```

`AddMovementInput`은 즉시 위치를 바꾸는 함수가 아니라 이동 컴포넌트가 처리할 입력을 누적한다. 충돌을 무시하고 `SetActorLocation`으로 매 프레임 이동하면 CharacterMovement가 제공하는 바닥 판정과 네트워크 예측을 우회할 수 있다.

## UE5 Enhanced Input

책과 오래된 예제는 프로젝트 설정의 Axis/Action Mapping과 `BindAxis`, `BindAction`을 사용한다. UE5의 Enhanced Input은 입력을 에셋으로 나눈다.

- Input Action: Move, Look, Jump처럼 의미 있는 행동
- Input Mapping Context: 키와 액션의 연결 묶음
- Trigger: 누름, 홀드, 연속 입력 같은 발동 조건
- Modifier: 축 반전, 데드존, 스케일처럼 입력 값 변환

```cpp
void AStudyCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);

    if (UEnhancedInputComponent* Enhanced = Cast<UEnhancedInputComponent>(Input))
    {
        Enhanced->BindAction(MoveAction, ETriggerEvent::Triggered,
                             this, &AStudyCharacter::HandleMove);
        Enhanced->BindAction(LookAction, ETriggerEvent::Triggered,
                             this, &AStudyCharacter::HandleLook);
    }
}
```

Mapping Context는 로컬 플레이어의 Enhanced Input Subsystem에 추가한다. 메뉴, 차량, 전투처럼 상황별 Context를 교체하면 거대한 입력 함수 하나에 모든 상태 분기를 넣지 않아도 된다.

## 두 가지 회전 방식

3인칭 캐릭터에서 흔히 선택하는 방식은 두 가지다.

1. 컨트롤러 방향을 바라본다: 조준 중심 게임에 어울린다. `bUseControllerRotationYaw`를 켠다.
2. 이동 방향을 바라본다: 자유 이동 게임에 어울린다. Controller Yaw 사용을 끄고 CharacterMovement의 `bOrientRotationToMovement`를 켠다.

두 옵션을 동시에 무심코 켜면 회전 책임이 충돌할 수 있다. 캐릭터, 컨트롤러, 스프링 암 중 누가 회전을 소유하는지 먼저 정한다.

## 애셋 연결의 안전성

C++ 생성자에서 문자열 경로로 메시를 찾는 코드는 학습에는 간단하지만 애셋 이동이나 이름 변경에 약하다. 실무에서는 다음 선택지를 비교한다.

- 클래스 기본값에서 직접 지정: 단순하고 디자이너 친화적
- `TSoftObjectPtr`/`TSoftClassPtr`: 필요할 때 비동기 로드 가능
- Asset Manager: 에셋 분류, 번들, 로딩 정책을 중앙 관리

코드가 반드시 가져야 하는 기본 컴포넌트와 콘텐츠 팀이 교체할 수 있는 애셋을 분리하는 것이 핵심이다.

## 흔한 문제 확인

- 입력이 없다: Pawn이 실제로 PlayerController에 빙의됐는지, Mapping Context가 로컬 플레이어에 추가됐는지 확인한다.
- 카메라만 돌고 캐릭터가 안 움직인다: `SetupPlayerInputComponent` 바인딩과 이동 컴포넌트의 활성 상태를 본다.
- 메시가 바닥에 묻힌다: 캡슐 원점과 메시의 상대 위치·회전을 맞춘다.
- 회전이 떨린다: Controller Yaw와 이동 방향 회전을 동시에 적용하지 않았는지 확인한다.
- 멀티플레이에서 순간 이동한다: CharacterMovement 대신 직접 Transform을 바꾸고 있지 않은지 본다.

## 복습 질문

- Controller와 Pawn을 분리하면 차량 탑승이나 관전을 어떻게 단순화할 수 있는가?
- `SetActorLocation`과 `AddMovementInput`은 이동 규칙과 네트워크에서 어떤 차이가 있는가?
- 입력 Mapping Context를 상태별로 나누면 어떤 결합을 줄일 수 있는가?
- 카메라, Controller, Character 중 Yaw 회전의 주체는 누구인가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 폰의 제작과 조작](https://wecandev.tistory.com/129)
- [코딩 부부: 캐릭터의 제작과 컨트롤](https://wecandev.tistory.com/130)
