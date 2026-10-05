---
title: "언리얼 네트워크 공부 05: RPC, 전투 동기화와 지연 대응"
description: "Server·Client·NetMulticast RPC의 실행 조건, Reliable 선택, 공격과 체력 동기화, 로컬 예측·패킷 지연 테스트·대역폭 최적화를 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine", "Networking", "RPC", "Latency", "Combat"]
featured: false
draft: true
aiGenerated: true
---

Property Replication이 현재 상태를 수렴시키는 장치라면 RPC는 다른 머신의 Actor 인스턴스에서 함수를 실행하도록 요청하는 장치다. 둘은 경쟁 관계가 아니라 역할이 다르다. 지속 상태를 RPC만으로 쌓거나 모든 순간 행동을 프로퍼티로 토글하면 늦은 참가, 유실, 호출 순서와 중복 처리 문제가 생긴다.

## RPC 종류

| 종류 | 일반적인 방향 | 용도 |
| --- | --- | --- |
| Server RPC | 소유 클라이언트 → 서버 | 입력과 행동 요청 |
| Client RPC | 서버 → 특정 소유 클라이언트 | 개인 알림이나 소유자 전용 처리 |
| NetMulticast RPC | 서버 → 서버와 관련 클라이언트 | 여러 참여자에게 순간 효과 실행 |

```cpp
UFUNCTION(Server, Reliable)
void ServerTryAttack(uint16 InputSequence);

void AStudyCharacter::ServerTryAttack_Implementation(uint16 InputSequence)
{
    if (!CanAttack(InputSequence))
        return;

    StartAuthoritativeAttack(InputSequence);
}
```

RPC 지정자가 함수 호출의 권한 검증을 대신하지 않는다. 서버는 공격 속도, 현재 상태, 장비, 거리와 입력 순서를 검증해야 한다. 클라이언트가 보내는 Hit Actor나 피해량을 정답으로 받지 않는다.

## Reliable은 중요도의 동의어가 아니다

Reliable RPC는 순서대로 전달될 때까지 재전송되지만 무제한 무료 보장은 아니다. 매우 자주 발생하는 입력을 Reliable로 보내고 네트워크가 막히면 큐가 쌓여 뒤의 중요한 호출도 늦어질 수 있다.

```text
Reliable 후보
  - 낮은 빈도의 확정 요청
  - 누락되면 상태 전이가 깨지는 명령

Unreliable 후보
  - 다음 업데이트로 대체 가능한 고빈도 정보
  - 일시적이고 오래되면 가치가 없는 표현
```

중요한 지속 상태는 Reliable RPC 반복보다 Property Replication으로 최종 값을 수렴시키는 편이 자연스러울 수 있다. RPC 빈도 제한과 서버 측 rate limit도 함께 둔다.

## 공격 구현의 기본 흐름

서버 응답을 받은 뒤에만 로컬 공격 애니메이션을 시작하면 RTT만큼 입력 반응이 늦어진다. 반대로 클라이언트가 모든 결과를 확정하면 치트와 불일치에 취약하다. 입력 표현은 예측하고 결과는 서버가 확정하는 구조를 사용할 수 있다.

```text
Owning Client
  1. 입력 수락, 로컬 Montage 즉시 재생
  2. ServerTryAttack(sequence, aim data) 전송

Server
  3. 상태·쿨다운·입력 데이터 검증
  4. 권위 공격 시작
  5. 서버 시점에서 Hit 판정과 Damage 적용
  6. 공격/체력 상태 복제

Clients
  7. 원격 캐릭터 표현 재생
  8. 소유자는 예측과 서버 결과가 다르면 취소·보정
```

공격 시작을 Multicast 하나로만 표현하면 늦게 참가한 사용자가 현재 공격 상태를 복구하기 어렵고 소유 클라이언트는 왕복 지연을 체감한다. 공격 상태, 시작 시각 또는 Montage Section처럼 복구에 필요한 최소 상태와 순간 효과를 구분한다.

## 체력은 서버 상태로 복제한다

체력 변경은 서버에서만 수행하고 RepNotify로 UI와 피격 표현을 갱신한다.

```cpp
void UHealthComponent::ApplyDamageOnServer(float Amount)
{
    check(GetOwner()->HasAuthority());

    const float Previous = Health;
    Health = FMath::Clamp(Health - Amount, 0.0f, MaxHealth);
    HandleHealthChanged(Previous, Health); // 서버 처리
}

void UHealthComponent::OnRep_Health(float Previous)
{
    HandleHealthChanged(Previous, Health); // 클라이언트 표현
}
```

죽음은 `Health == 0`에서 파생할 수도 있고 명시적 상태로 복제할 수도 있다. 어느 쪽이든 사망 처리, 충돌 비활성화, 입력 차단과 UI가 같은 권위 상태에서 일관되게 파생되어야 한다.

## 위치와 방향을 양자화하기

네트워크에 전송하는 값은 필요한 정밀도만 사용한다. `FVector_NetQuantize` 계열은 위치나 방향의 정밀도를 줄여 대역폭을 절약할 수 있다. 모든 벡터에 기계적으로 적용하지 말고 오차 허용 범위와 직렬화 크기를 확인한다.

공격 요청에 전체 Transform과 여러 float를 보내기보다 입력 방향, 시퀀스, 클라이언트 시각 등 서버가 판정을 재구성하는 최소 정보를 보낸다. 그러나 클라이언트 시각은 거짓일 수 있으므로 서버가 허용 가능한 범위로 제한한다.

## 패킷 지연과 손실을 의도적으로 만든다

로컬 환경에서는 RPC 왕복이 너무 빨라 나쁜 UX가 숨는다. PIE나 실행 인자에서 패킷 시뮬레이션 설정을 사용해 조건을 재현한다. 설정 이름과 적용 방식은 엔진 버전을 확인하고, 예를 들어 지연·분산·손실을 단계적으로 준다.

```ini
[PacketSimulationSettings]
PktLag=150
PktLagVariance=30
PktLoss=2
```

테스트 매트릭스는 다음을 포함한다.

- RTT 50/100/200ms 수준
- 지터가 있는 환경
- 낮은 비율의 패킷 손실
- 순간적인 대역폭 제한
- 공격 중 연결 종료와 재접속
- 서로 다른 지연을 가진 두 플레이어의 교전

패킷 시뮬레이션 값은 한 방향 또는 도구별 의미가 다를 수 있으므로 실제 관측 RTT를 로그나 Insights에서 확인한다.

## 보정 정책은 게임 규칙이다

예측 공격을 서버가 거절했을 때 애니메이션을 즉시 끊을지, 헛스윙으로 마무리할지, 자원 UI를 되돌릴지 결정해야 한다. 정확성만 강조해 순간 이동과 모션 끊김을 만들면 플레이 경험이 나빠지고, 부드러움만 강조해 잘못된 판정을 오래 보여주면 신뢰가 깨진다.

총기 게임의 지연 보상은 서버가 과거 위치를 기록하고 발사 시각의 상태로 되감아 판정할 수 있다. 그러나 클라이언트가 주장하는 과거 시각을 무제한 신뢰하면 높은 지연이나 조작된 타임스탬프가 이점이 된다. 되감기 상한, 서버 시간 동기, 기록 비용과 피격자 관점의 공정성을 함께 설계한다.

## 대역폭과 CPU 최적화

- Tick마다 RPC를 보내기 전에 상태 변화나 입력 묶음으로 대체할 수 있는지 본다.
- 모든 이펙트를 Multicast하지 말고 복제 상태에서 로컬로 파생 가능한 표현을 구분한다.
- 공격 대상과 범위를 서버가 다시 계산하되 비싼 질의를 무제한 요청하지 못하게 한다.
- `Reliable` 호출에 사용자 입력 빈도 제한을 둔다.
- 고빈도 배열은 전체 재전송보다 변경분 직렬화를 검토한다.
- Networking Insights로 Actor, Property, RPC별 실제 바이트와 빈도를 확인한다.

## 보안 점검

Server RPC의 모든 매개변수는 신뢰할 수 없는 네트워크 입력이다.

- 배열 길이와 문자열 크기에 상한이 있는가?
- Actor 참조가 현재 월드의 유효한 대상인가?
- 호출자가 해당 대상과 상호작용할 권리가 있는가?
- 거리, 시야, 쿨다운, 자원과 상태 전이가 가능한가?
- 중복 sequence와 오래된 요청을 거부하는가?
- 실패 요청을 로그로 남기되 스팸으로 로그를 고갈시키지 않는가?

클라이언트의 화면을 자연스럽게 만드는 예측과 서버 권한 검사는 서로 다른 문제이며 둘 다 필요하다.

## 복습 질문

- 지속 상태와 순간 이벤트를 Property Replication과 RPC에 어떻게 나눌 것인가?
- 모든 입력을 Reliable RPC로 보내면 지연 환경에서 어떤 문제가 생길 수 있는가?
- 로컬 공격 예측과 서버 판정을 함께 사용할 때 거절 경로는 어떻게 설계해야 하는가?
- 지연 보상에서 서버가 클라이언트 타임스탬프를 그대로 믿으면 안 되는 이유는 무엇인가?

## 참고 자료

- [DesignerD: UE 개념정리 - Network](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 캐릭터 공격 구현 개선](https://meo-young.tistory.com/132)
- [Epic Games: Testing and Debugging Networked Games](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)
- [Epic Games: Performance and Bandwidth Tips](https://dev.epicgames.com/documentation/unreal-engine/performance-and-bandwidth-tips-for-unreal-engine)
