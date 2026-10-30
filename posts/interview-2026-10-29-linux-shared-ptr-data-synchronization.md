---
title: "shared_ptr의 수명 관리와 데이터 동기화는 다르다"
description: "단일 카운터의 atomic 연산과 여러 필드의 mutex 보호를 구분한다."
date: "2026-10-29"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "C++", "동기화"]
draft: false
aiGenerated: true
---

## 오늘의 질문

두 스레드가 각자 shared_ptr<State>를 가지고 같은 객체의 count를 동시에 증가시킵니다. 객체 수명은 충분히 유지됩니다. 이 코드가 안전한지 설명하고, count 하나를 갱신할 때와 여러 필드의 일관성을 유지할 때 각각 어떤 방법을 선택하겠습니까?

## 핵심 해설

서로 다른 shared_ptr 인스턴스로 같은 객체를 소유하는 것은 대상 데이터에 대한 동기화를 제공하지 않는다. 단일 카운터의 증가는 atomic fetch_add 또는 atomic의 ++를 사용한다. atomic load 후 store를 별도로 수행하면 읽기-수정-쓰기 전체가 원자적이지 않다.

여러 필드 사이의 관계를 보장해야 한다면 같은 mutex로 관련 읽기와 쓰기를 묶는 것이 명확하다. 필드를 각각 atomic으로 만드는 것만으로 복수 필드의 일관된 스냅샷을 보장하지는 않는다. 같은 shared_ptr 변수 자체를 동시에 수정하는 경우도 별도 동기화가 필요하다.

## 면접용 모범 답변

shared_ptr는 객체의 공유 수명을 관리하지만 객체 내부의 동시 접근을 보호하지 않습니다. 단순 카운터는 atomic의 fetch_add로 증가시키고, 여러 필드의 일관성이 필요하면 같은 mutex로 관련 읽기와 쓰기를 보호하겠습니다.

## 참고 자료

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
