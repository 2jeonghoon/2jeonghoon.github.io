---
title: "언리얼 C++ 공부 03: 애니메이션과 콤보 공격"
description: "AnimInstance와 상태 머신, Montage·Section·Notify를 연결해 이동과 콤보 공격을 구성하고 게임 로직과 표현을 분리하는 방법을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Animation", "AnimMontage", "Combat"]
featured: false
draft: true
aiGenerated: true
---

애니메이션은 단순히 영상을 재생하는 기능이 아니다. 캐릭터의 이동 상태를 시각적으로 표현하고, 공격 판정이 발생할 시점과 다음 입력을 받을 구간을 게임 로직에 알려 주는 시스템이다. 언리얼에서는 C++ `UAnimInstance`, 애니메이션 블루프린트, 상태 머신, Montage와 Notify가 이 책임을 나눠 가진다.

## AnimInstance와 AnimGraph

AnimInstance는 스켈레탈 메시마다 생성되어 애니메이션 상태를 계산한다. C++ 클래스는 속도와 공중 여부처럼 게임 상태를 읽어 노출하고, AnimGraph는 그 값에 따라 포즈를 선택하고 섞는다.

```cpp
void UStudyAnimInstance::NativeUpdateAnimation(float DeltaSeconds)
{
    Super::NativeUpdateAnimation(DeltaSeconds);

    const APawn* Pawn = TryGetPawnOwner();
    if (Pawn == nullptr)
        return;

    Speed = Pawn->GetVelocity().Size2D();

    if (const ACharacter* Character = Cast<ACharacter>(Pawn))
    {
        bIsInAir = Character->GetCharacterMovement()->IsFalling();
    }
}
```

애니메이션 갱신은 에디터 미리보기처럼 Pawn이 없는 상황에서도 호출될 수 있으므로 null을 정상 상태로 다룬다. 애니메이션 인스턴스가 전투 결과를 직접 결정하기보다 캐릭터 상태를 읽고 표현하는 방향이 책임을 분명하게 한다.

## 상태 머신으로 이동 표현하기

상태 머신은 Idle/Walk/Run/Jump처럼 오래 유지되는 상태와 전환 조건을 표현하기 좋다.

```text
Idle/Run ── bIsInAir ──> Jump
   ↑                       │
   └── !bIsInAir ──────────┘

Idle <── Speed <= 임계값 ──> Run
```

실제 이동 속도와 애니메이션 재생 속도가 맞지 않으면 발이 미끄러져 보인다. Blend Space에서 방향과 속도를 사용하고, CharacterMovement의 최대 속도와 애니메이션 루트 이동량을 함께 조정한다.

## Montage는 일시적인 행동에 적합하다

공격, 피격, 회피처럼 이동 상태 위에 잠시 재생되는 행동은 Animation Montage로 구성할 수 있다. Montage의 Section을 `Attack1`, `Attack2`, `Attack3`처럼 나누면 하나의 애셋에서 콤보 순서를 제어할 수 있다.

```cpp
void UStudyAnimInstance::PlayAttackMontage()
{
    if (AttackMontage != nullptr && !Montage_IsPlaying(AttackMontage))
    {
        Montage_Play(AttackMontage, 1.0f);
    }
}

void UStudyAnimInstance::JumpToAttackSection(int32 ComboIndex)
{
    const FName Section(*FString::Printf(TEXT("Attack%d"), ComboIndex));
    Montage_JumpToSection(Section, AttackMontage);
}
```

문자열 규칙만 믿으면 잘못된 Section 이름이 런타임까지 발견되지 않는다. 가능한 Section 목록과 최대 콤보 수를 데이터로 명시하고 시작할 때 검증하는 편이 안전하다.

## Notify는 애니메이션 시간과 게임 이벤트를 연결한다

공격 모션 전체에서 항상 충돌 판정을 하면 이미 지나간 칼에도 피해가 들어간다. 타격 가능한 프레임에 Notify를 두고, Notify를 받은 AnimInstance가 델리게이트로 캐릭터에 알리면 판정 시점을 애니메이션과 맞출 수 있다.

```cpp
DECLARE_MULTICAST_DELEGATE(FOnAttackHitCheck);
DECLARE_MULTICAST_DELEGATE(FOnNextAttackCheck);

FOnAttackHitCheck OnAttackHitCheck;
FOnNextAttackCheck OnNextAttackCheck;

void UStudyAnimInstance::AnimNotify_AttackHitCheck()
{
    OnAttackHitCheck.Broadcast();
}
```

Notify State를 사용하면 시작과 끝이 있는 공격 판정 창도 표현할 수 있다. 다만 애니메이션 Notify는 **판정을 요청하는 시점**일 뿐 피해량과 피격 가능 여부 같은 최종 규칙은 권한을 가진 게임 로직이 결정해야 한다.

## 콤보 입력 버퍼

첫 공격이 재생되는 중에 다음 입력을 받았다고 즉시 두 번째 Section으로 이동하면 모션이 끊긴다. 입력은 “다음 공격 예약”으로 저장하고, `NextAttackCheck` Notify 시점에 예약 여부를 검사한다.

```text
입력 시작
  ├─ 공격 중이 아님 → Combo 1 재생
  └─ 공격 중임     → 다음 공격 예약

NextAttackCheck Notify
  ├─ 예약 있음 → 다음 Section으로 연결
  └─ 예약 없음 → 현재 Montage 종료
```

콤보 인덱스, 입력 가능 구간, 종료 시 초기화라는 세 상태를 한곳에서 관리해야 한다. Montage 종료 콜백은 정상 종료와 중단 모두 호출될 수 있으므로 사망이나 피격으로 공격이 취소된 경우도 초기화한다.

## Root Motion과 게임 이동

공격 애니메이션 자체에 전진 이동이 들어 있다면 Root Motion을 사용할 수 있다. 표현과 충돌 이동이 자연스럽게 맞지만 네트워크 예측, 경사면, 장애물 처리와 결합할 때 복잡해진다. 반대로 코드가 이동을 담당하면 판정은 단순하지만 애니메이션과 속도를 세밀하게 맞춰야 한다.

선택 기준은 다음과 같다.

- 이동 거리가 기술의 핵심이고 모션이 주도한다면 Root Motion을 검토한다.
- 일반 이동과 서버 예측이 중요하다면 CharacterMovement 중심을 유지한다.
- 어떤 방식을 쓰든 서버가 최종 위치와 공격 가능성을 검증한다.

## 애니메이션과 게임 규칙의 경계

좋은 구조에서는 AnimInstance가 체력을 깎지 않는다. 캐릭터나 전투 컴포넌트가 공격 요청과 판정을 소유하고, AnimInstance는 재생과 타이밍 이벤트를 맡는다.

```text
입력 → Character/CombatComponent → Montage 재생 요청
                                    ↓
                              HitCheck Notify
                                    ↓
Character/CombatComponent → 충돌 검사 → 대미지 적용
```

이 경계는 네트워크 구현에서도 중요하다. 클라이언트가 애니메이션을 재생했다는 사실만으로 서버 피해가 확정되면 안 된다.

## 복습 질문

- 지속 상태는 상태 머신, 일시 행동은 Montage가 적합한 이유는 무엇인가?
- Notify가 직접 피해를 적용하지 않고 이벤트만 전달하게 한 이유는 무엇인가?
- 콤보 입력을 즉시 실행하지 않고 버퍼에 저장하는 이유는 무엇인가?
- Root Motion을 멀티플레이에 적용할 때 무엇을 서버가 검증해야 하는가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 애니메이션 시스템의 설계](https://wecandev.tistory.com/134)
- [코딩 부부: 애니메이션 시스템 활용](https://wecandev.tistory.com/135)
