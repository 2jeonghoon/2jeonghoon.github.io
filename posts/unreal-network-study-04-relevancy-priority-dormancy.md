---
title: "언리얼 네트워크 공부 04: Relevancy, 빈도, 우선순위와 Dormancy"
description: "연결별 Actor Relevancy, NetUpdateFrequency, Priority, Dormancy와 저수준 복제 흐름을 이해하고 Networking Insights로 대역폭을 측정하는 방법을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "UE Networking"
tags: ["Unreal Engine", "Networking", "Relevancy", "Dormancy", "Network Insights"]
featured: false
draft: true
aiGenerated: true
---

복제를 켜는 것만으로 네트워크 설계가 끝나지 않는다. 서버에 Actor가 수천 개 있고 클라이언트가 수십 명이라면 모든 Actor를 매 프레임 모든 연결에 보낼 수 없다. 언리얼은 먼저 복제 후보를 고르고, 연결마다 관련성을 판단한 뒤, 제한된 대역폭에서 우선순위를 계산해 실제 전송 대상을 정한다.

## 저수준 흐름을 큰 단계로 보기

기본 NetDriver의 세부 구현은 버전에 따라 달라질 수 있지만 개념적으로 다음 흐름을 따른다.

```text
서버의 복제 Actor 집합
  ↓ Dormancy·Update Frequency·기본 조건 검사
이번 프레임 후보 목록
  ↓ 연결별 Ownership·Relevancy 검사
Connection별 후보
  ↓ Priority와 대역폭 예산
실제 전송 Actor 선택
  ↓ 프로퍼티 변경분·RPC 직렬화
네트워크 전송
```

문제를 분석할 때 “복제가 안 된다”를 하나의 원인으로 보지 않고 어느 단계에서 제외됐는지 확인한다.

## Relevancy는 연결별 질문이다

Actor Relevancy는 이 Actor의 업데이트를 특정 연결이 알아야 하는지를 판단한다. 같은 Actor가 플레이어 A에게는 관련 있고 멀리 있는 플레이어 B에게는 관련 없을 수 있다.

기본 판단에는 다음 설정과 관계가 영향을 준다.

- 항상 관련 있음: `bAlwaysRelevant`
- 소유자에게만 관련 있음: `bOnlyRelevantToOwner`
- 소유자나 부착 부모의 관련성을 사용
- 거리 기반 판단과 `NetCullDistanceSquared`
- `IsNetRelevantFor` 재정의

거리만으로 관련성을 정하면 멀리서 들리는 전역 알림, 팀 정보, 저격 공격처럼 게임 규칙상 필요한 상태가 누락될 수 있다. 반대로 모든 것을 Always Relevant로 만들면 최적화가 사라진다. 공간, 팀, 시야와 규칙을 기준으로 데이터별 관심 범위를 설계한다.

관련성을 잃은 Actor가 클라이언트에서 어떻게 보이는지도 확인해야 한다. 잠깐 사라졌다 다시 관련 영역에 들어왔을 때 초기 상태와 표현이 복구되어야 한다.

## NetUpdateFrequency는 상한에 가깝다

`NetUpdateFrequency`는 Actor가 복제를 고려받는 빈도에 영향을 준다. 값을 높인다고 매번 데이터가 생기는 것은 아니며, 낮추면 상태 변화가 네트워크에 반영되기까지 기다릴 수 있다.

모든 Actor를 높은 빈도로 설정하기보다 변화 특성에 맞춘다.

- 플레이어 캐릭터: 빠르고 예측하기 어려워 상대적으로 높은 빈도
- 느린 AI: 더 낮은 빈도와 보간
- 거의 변하지 않는 문이나 상자: 낮은 빈도 또는 Dormancy
- 경기 전체 상태: 이벤트 빈도에 맞는 낮은 갱신

`MinNetUpdateFrequency`와 적응형 업데이트가 적용되는 구성도 있으므로 프로젝트 설정과 실제 엔진 버전을 확인한다. 숫자를 복사하기보다 허용 지연과 트래픽을 측정해 정한다.

## Priority는 밀린 시간을 함께 본다

대역폭이 부족하면 모든 관련 Actor를 즉시 보낼 수 없다. Priority는 Actor의 중요도뿐 아니라 마지막 전송 이후 경과 시간 등을 반영해 계속 뒤로 밀리는 starvation을 줄인다.

커스텀 우선순위를 설계할 때 가까운 Actor에만 높은 값을 주면 멀리 있는 중요한 목표가 영원히 업데이트되지 않을 수 있다. 게임플레이 중요도, 거리, 관찰 방향, 소유 관계와 대기 시간을 함께 고려한다.

우선순위는 대역폭을 만들어내지 않는다. 필수 데이터 자체가 예산을 초과한다면 빈도, 표현 크기, Actor 수와 관심 영역을 줄여야 한다.

## Dormancy로 변하지 않는 Actor를 쉰다

Dormant Actor는 깨어나거나 dormancy를 flush할 때까지 복제 고려 대상에서 제외되어 CPU와 대역폭을 줄일 수 있다. 문, 상자, 파괴 가능한 환경처럼 대부분의 시간 동안 상태가 고정된 Actor에 적합하다.

```cpp
void AReplicatedDoor::SetDoorOpen(bool bNewOpen)
{
    if (!HasAuthority() || bIsOpen == bNewOpen)
        return;

    FlushNetDormancy();
    bIsOpen = bNewOpen;
    ForceNetUpdate();
}
```

핵심은 **값을 바꾸기 전에 깨우는 것**이다. Dormant 상태에서 프로퍼티만 변경하면 클라이언트에 전달되지 않는다. 자주 변하는 Actor를 반복해서 잠재우고 깨우면 관리 비용이 커져 이점이 사라질 수 있다.

Dormant Actor는 기본 동작에서 관련성 검사 방식도 다를 수 있으므로, 관련 영역 밖으로 나간 클라이언트에서 Actor가 예상대로 제거되는지 Replication Graph 사용 여부와 함께 검증한다.

## Replication Graph와 Iris

대규모 월드에서는 기본적으로 모든 복제 Actor를 연결별로 검사하는 비용이 커질 수 있다. Replication Graph는 공간이나 규칙 기반 노드에 Actor를 분류해 연결별 후보를 효율적으로 만든다. UE5의 Iris는 새로운 복제 시스템이지만 프로젝트와 엔진 버전에 따라 적용 범위와 설정이 다르다.

기존 튜토리얼의 개념을 버리지 말되 사용하는 시스템을 확인한다.

- 기본 NetDriver Actor Replication인가?
- Replication Graph를 사용하고 있는가?
- Iris가 활성화된 프로젝트/기능인가?
- 같은 Dormancy와 Relevancy 설정이 해당 경로에서 어떻게 해석되는가?

## Networking Insights로 측정하기

추측 대신 네트워크 트레이스를 수집한다. 공식 문서 기준으로 `-NetTrace=1`을 사용해 Networking Insights에서 패킷과 복제 데이터를 분석할 수 있다.

다음 질문을 중심으로 본다.

- 어떤 Actor 클래스가 가장 많은 바이트를 보내는가?
- 어떤 프로퍼티와 RPC가 자주 전송되는가?
- 플레이어 수가 늘 때 연결당/서버 전체 트래픽이 어떻게 변하는가?
- 관련성 밖 Actor가 계속 전송되는가?
- 빈도 조정 후 조작감과 보간 품질이 유지되는가?
- 패킷 손실과 지연 조건에서 Reliable backlog가 생기는가?

최적화 전후에 같은 이동 경로, 같은 인원, 같은 시간으로 캡처해야 비교할 수 있다.

## 최적화 순서

Epic의 대역폭 지침처럼 불필요한 Actor 복제를 먼저 끄고, 다음으로 빈도, Dormancy, Relevancy를 조정한 뒤 마지막에 프로퍼티 표현을 줄이는 순서가 이해하기 쉽다.

1. 복제할 필요가 없는 Actor인가?
2. 항상 깨어 있고 모든 연결에 관련 있어야 하는가?
3. 현재 빈도가 게임플레이 요구보다 높은가?
4. 조건부 복제로 수신자를 줄일 수 있는가?
5. 더 작은 타입, 양자화, Fast Array 등으로 표현을 줄일 수 있는가?

정확성을 깨뜨리는 압축보다 불필요한 전송 자체를 제거하는 편이 우선이다.

## 복습 질문

- Relevancy와 Priority는 각각 어떤 단계의 결정을 하는가?
- NetUpdateFrequency를 높여도 매번 프로퍼티 데이터가 전송되는 것은 아닌 이유는 무엇인가?
- Dormant Actor의 값을 바꾸기 전에 깨워야 하는 이유는 무엇인가?
- 대규모 월드에서 Replication Graph가 줄이려는 계산은 무엇인가?

## 참고 자료

- [DesignerD: UE 개념정리 - Network](https://designerd.tistory.com/category/%E2%AD%90%20Unreal%20Engine/UE%20%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC%20-%20Network?page=1)
- [이게뭐영: 이득우의 언리얼 프로그래밍 Part3 정리](https://meo-young.tistory.com/category/%EA%B0%95%EC%9D%98/%5B%EA%B0%95%EC%9D%98%5D%20%EC%9D%B4%EB%93%9D%EC%9A%B0%EC%9D%98%20%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%B0%8D%20Part3)
- [Epic Games: Detailed Actor Replication Flow](https://dev.epicgames.com/documentation/unreal-engine/detailed-actor-replication-flow-in-unreal-engine)
- [Epic Games: Actor Network Dormancy](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-network-dormancy-in-unreal-engine)
- [Epic Games: Networking Insights](https://dev.epicgames.com/documentation/unreal-engine/networking-insights-in-unreal-engine)
