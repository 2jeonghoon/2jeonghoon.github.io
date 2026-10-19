---
title: "04: 스마트 포인터"
description: "Item 18–22. 단독 소유, 공유 소유, 약한 관찰과 PImpl의 해제 위치를 정리합니다."
date: "2026-10-19"
order: 4
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "Smart Pointer", "소유권"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 4장 Item 18–22를 공부한다. 책 전체 본문의 번역이 아닌 공개 목차와 언어·라이브러리 참조 기반의 독자적인 학습 노트다. 기본 범위는 C++11/14이며 코드 블록은 독립적인 선언·함수 예제다.

## Item 18. 단독 소유에는 unique_ptr 사용하기

```cpp
#include <memory>
#include <utility>

void transfer() {
    auto queued = std::make_unique<int>(42); // C++14
    auto running = std::move(queued);
    // queued는 비었고 running이 객체를 소유한다.
}
```

unique_ptr는 복사를 금지하고 이동으로 소유권을 넘긴다. 함수가 unique_ptr를 값으로 받으면 소유권을 전달한다는 뜻을 드러낼 수 있다. 단순히 빌려 쓰는 함수에는 T&나 T*가 더 적절하다.

기본 삭제자 외에도 파일 닫기 등의 사용자 삭제자를 지정할 수 있다. 이때 삭제자의 타입은 unique_ptr 타입의 일부이며 상태 있는 삭제자는 저장 비용에 영향을 줄 수 있다. `release()`는 소유권을 놓기만 하므로 받는 쪽이 반드시 해제를 책임져야 한다.

배열에는 unique_ptr<T[]>처럼 배열 삭제와 맞는 타입을 사용한다. 일반적인 연속 원소 저장에는 vector가 더 자연스러운 경우가 많다. [unique_ptr 명세](https://eel.is/c++draft/unique.ptr)

## Item 19. 공유 수명이 필요할 때 shared_ptr 선택하기

```cpp
#include <memory>
struct Texture { int width = 64; };
void sharing() {
    auto first = std::make_shared<Texture>();
    auto second = first;
    first.reset(); // second가 아직 객체를 유지한다.
}
```

shared_ptr 복사는 같은 소유 그룹에 참여한다. 마지막 소유자가 사라질 때 삭제자가 실행된다. 소유권과 실제 포인터는 제어 블록으로 연결되며 참조 횟수 관리 비용을 고려해야 한다.

**주의:** 같은 raw pointer로 별개의 shared_ptr를 만들면 서로 다른 소유 그룹이 생겨 중복 해제가 발생할 수 있다. 이미 소유한 shared_ptr를 복사하거나, 자신의 공유 소유자를 얻어야 하는 타입이라면 enable_shared_from_this를 알맞게 사용한다. 생성자에서 아직 공유 소유 관계가 설정되지 않았는데 shared_from_this를 호출해서는 안 된다.

제어 블록의 동기화는 가리키는 객체의 동기화를 뜻하지 않는다. 서로 다른 shared_ptr 객체가 같은 소유 그룹을 다루는 것과 하나의 shared_ptr 변수 자체를 동시 수정하는 것도 구별해야 한다. [shared_ptr 명세](https://eel.is/c++draft/util.smartptr.shared)

## Item 20. 수명을 연장하지 않는 관찰에는 weak_ptr 사용하기

```cpp
#include <memory>
struct Node {
    std::shared_ptr<Node> child;
    std::weak_ptr<Node> parent;
};
void visit(std::weak_ptr<Node> candidate) {
    if (auto node = candidate.lock()) {
        // 이 블록에서는 node가 대상의 수명을 유지한다.
        (void)node->child;
    }
}
```

부모와 자식이 서로 shared_ptr로 소유하면 외부 소유자가 사라져도 순환이 남을 수 있다. 수명 책임이 없는 역방향 관계를 weak_ptr로 표현하면 순환을 끊을 수 있다. 양방향 중 무엇이 소유 관계인지 먼저 정하는 설계가 필요하다.

expired()를 확인한 뒤 raw pointer로 접근하는 방식은 안전한 수명 확보가 아니다. 확인과 사용 사이에 마지막 소유자가 사라질 수 있다. lock()의 성공 결과를 지역 shared_ptr로 유지한다. lock은 객체의 데이터 경쟁까지 해결하지 않는다. [weak_ptr 명세](https://eel.is/c++draft/util.smartptr.weak)

## Item 21. make_unique와 make_shared를 기본 생성 경로로 검토하기

```cpp
#include <memory>
#include <string>

auto title = std::make_unique<std::string>(5, 'x'); // C++14
// 저장 문자열은 "xxxxx"
auto score = std::make_shared<int>(100);           // C++11
```

make 함수는 직접 new를 노출하지 않고 객체 생성과 소유자 생성을 연결한다. 특히 C++11/14의 복잡한 함수 인수 평가에서 raw pointer를 먼저 만들고 다른 인수가 예외를 던지는 공백을 줄일 수 있다. 자원은 생성 직후 소유자에게 맡기는 습관이 핵심이다.

make_shared는 객체와 제어 블록을 함께 할당할 수 있다. 그러나 weak_ptr가 남으면 객체 소멸 후에도 그 결합된 할당의 저장 공간 반환이 늦어질 수 있다. 큰 객체와 긴 weak_ptr 수명 조합이라면 메모리 유지 비용도 검토한다.

사용자 삭제자가 필요하면 shared_ptr 생성자를 직접 사용하는 경우가 있다. initializer_list 생성자를 선택해야 하는 타입은 make 함수의 인수 전달이 중괄호와 다르다는 점도 확인한다. 모든 생성 경로를 make로 기계적으로 치환하지 않는다. [make_unique](https://eel.is/c++draft/unique.ptr.create) · [공유 소유자 생성](https://eel.is/c++draft/util.smartptr.shared.create)

## Item 22. PImpl에서는 불완전 타입과 해제 위치를 맞추기

공개 헤더에서 구현 타입을 전방 선언하고 포인터로 감추면 구현 의존성을 줄일 수 있다. unique_ptr는 불완전 타입을 멤버로 가질 수 있지만 기본 삭제자가 작동하는 위치에는 완전한 타입이 필요하다.

```cpp
// panel.h의 선언 조각
#include <memory>
class Panel {
    struct Impl;
    std::unique_ptr<Impl> impl_;
public:
    Panel();
    ~Panel();
    Panel(Panel&&) noexcept;
    Panel& operator=(Panel&&) noexcept;
};
```

```cpp
// panel.cpp: 위 헤더를 포함한 뒤 정의하는 조각
struct Panel::Impl { int selected = 0; };
Panel::Panel() : impl_(new Impl) {}
Panel::~Panel() = default;
Panel::Panel(Panel&&) noexcept = default;
Panel& Panel::operator=(Panel&&) noexcept = default;
```

이동 대입도 기존 구현을 해제할 수 있어 구현이 완전한 위치에 정의한다. 사용자 선언 소멸자가 자동 이동 생성을 억제하므로 필요한 이동 연산을 명시했다. 복사가 필요하면 구현을 새로 복제하는 의미까지 별도로 설계한다. shared_ptr로 바꾸어 불완전 타입 문제만 피하면 소유 모델까지 달라진다.

## 복습 메모

- 포인터가 필요한 이유보다 먼저 동적 수명과 소유자 수를 묻는다.
- get()은 빌린 포인터이며 새 소유자를 만드는 재료가 아니다.
- weak_ptr는 관찰, lock 결과는 사용 동안의 수명 보장이다.
- 삭제자 실행, 객체 소멸, 저장 공간 반환 시점을 구분한다.
- PImpl의 소멸자와 이동 대입 정의 위치를 함께 확인한다.

[저자 소개](https://www.aristeia.com/EMC%2B%2B.html) · [Core Guidelines의 소유권 지침](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rsmart). 현재 초안과 지침에는 이후 표준 기능도 있으므로 이 글의 C++11/14 범위와 구별한다.

[이전: 현대 C++로 옮겨가기](/?post=effective-modern-cpp-03-moving-to-modern-cpp) · [개요](/?post=effective-modern-cpp-overview) · [다음: 이동과 완벽 전달](/?post=effective-modern-cpp-05-rvalue-references-move-forwarding)
