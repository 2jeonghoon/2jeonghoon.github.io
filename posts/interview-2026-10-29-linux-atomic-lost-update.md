---
title: "atomic load와 store를 나눠 쓰면 증가가 누락되는 이유"
description: "lost update 실행 순서와 fetch_add, mutex를 비교한다."
date: "2026-10-29"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "C++", "atomic"]
draft: false
aiGenerated: true
---

## 오늘의 질문

여러 스레드가 아래 함수를 호출합니다.

~~~cpp
std::atomic<int> count{0};

void increment()
{
    int current = count.load();
    count.store(current + 1);
}
~~~

호출 횟수보다 최종 값이 작게 나올 수 있습니까? 가능하다면 실행 순서를 예로 들고 수정 방법을 설명해 주세요.

## 핵심 해설

초기 값 0에서 A load 0, B load 0, A store 1, B store 1 순서라면 결과는 1이다. 각 load/store는 원자적이어도 읽기-수정-쓰기 전체가 원자적인 것은 아니다. 이를 lost update라고 부른다. atomic 연산만 수행한 이 예는 C++의 data race에 의한 정의되지 않은 동작과 구분되는 논리적 경쟁이다.

단순 카운터는 다음과 같이 하나의 원자적 읽기-수정-쓰기 연산을 사용한다.

~~~cpp
std::atomic<int> count{0};
void increment()
{
    count.fetch_add(1); // 또는 ++count
}
~~~

mutex를 사용할 경우 모든 관련 접근에서 같은 보호 규칙을 지킨다. 여러 필드의 불변식을 함께 보호해야 할 때 특히 유용하다. 모든 접근을 mutex로 보호한다면 일반 int를 사용할 수도 있다. memory_order를 강하게 하는 것만으로 분리된 load와 store가 하나의 연산이 되지는 않는다.

## 면접용 모범 답변

두 스레드가 같은 값을 load하고 같은 값을 store하면 증가가 누락될 수 있습니다. 단순 카운터는 fetch_add로 증가 전체를 원자적으로 수행하겠습니다. 여러 값의 일관성이 필요하면 같은 mutex로 읽기와 수정을 묶겠습니다. 개별 atomic 접근과 복합 연산의 원자성은 다릅니다.

## 참고 자료

- [GCC: 원자적 연산과 fetch_add](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html)
