---
title: "신뢰할 수 없는 길이 필드를 안전하게 파싱하기"
description: "부분 수신, 길이 검증, 오버플로와 메모리 상한을 구분하는 파서를 설계한다."
date: "2026-10-28"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux"]
draft: false
aiGenerated: true
---

## 오늘의 질문

조작되거나 잘린 외부 패킷의 길이 필드를 사용해 할당과 복사를 수행한다. 메모리 상한이 있는 C++ 파서를 어떻게 설계하고 검증할까?

## 학습 상태

사용자가 답을 모르겠다고 밝혀 아래 내용을 학습용 해설로 정리했다.

## 핵심 해설

길이 필드는 상대가 주장한 값이다. 실제 받은 바이트 수, 프로토콜 허용 길이와 자원 예산을 각각 검증해야 한다. 예를 들어 본문 길이는 100인데 본문 10바이트만 받은 상태에서 100바이트를 복사하면 버퍼 밖을 읽을 수 있다.

TCP에서는 잘린 입력이 아직 덜 도착한 정상 메시지일 수 있다. 파싱 결과를 Complete, NeedMore, Invalid로 구분하고 EOF에 미완성 데이터가 남으면 잘린 메시지로 처리한다. 데이터그램처럼 경계가 이미 정해진 입력에서는 그 입력 형식에 맞게 판단한다.

검증 순서는 고정 헤더 최소 크기 → 바이트 순서에 따른 길이 해석 → 본문 최대 길이 → 실제 수신 본문 크기 → 필드 의미 검증이다. 검증 전에 길이만 믿고 대용량 메모리를 할당하지 않는다.

~~~cpp
// C++20 예시: 헤더 4바이트, 본문 최대 1MiB
enum class Result { NeedMore, Invalid, Complete };

Result inspect(std::span<const std::byte> input)
{
    constexpr std::size_t header = 4;
    constexpr std::uint32_t maxBody = 1024 * 1024;

    if (input.size() < header)
        return Result::NeedMore;

    std::uint32_t length = 0;
    for (std::size_t i = 0; i < header; ++i)
        length = (length << 8) | std::to_integer<std::uint32_t>(input[i]);

    if (length > maxBody)
        return Result::Invalid;

    if (length > input.size() - header)
        return Result::NeedMore;

    return Result::Complete; // 검증된 첫 프레임 경계, 본문 의미 검증은 별도
}
~~~

위 코드는 첫 프레임의 크기만 검증한다. 실제 호출자는 검증된 헤더와 본문 길이만 소비하고 남은 데이터는 다음 프레임에 사용한다. 필요한 헤더는 span, cstddef, cstdint다.

header + length를 무작정 계산하면 정수 오버플로가 생길 수 있다. 최소 헤더 길이를 먼저 확인하고 남은 크기와 비교하는 방식이 유용하다. count * element_size도 곱셈 전 상한 검증이 필요하다. 문자열 종료 문자, 중첩 깊이, 메시지 종류, 버전과 필드 간 일관성도 확인한다.

연결별 버퍼 상한뿐 아니라 전체 연결의 메모리 예산, 대기 시간, 파싱 CPU 예산을 제한한다. 연결마다 1MiB를 허용해도 연결이 많으면 전체 메모리가 고갈될 수 있다. 할당 실패도 처리한다.

잘못된 길이·형식은 정책에 따라 메시지 거부나 연결 종료로 처리하고, TCP 경계가 불명확한 상태에서 임의 위치부터 재동기화하지 않는다. 과도한 오류 로그 자체가 공격 수단이 되지 않도록 제한한다.

## 테스트

빈 입력, 헤더 1~3바이트, 본문 부족, 최대 길이와 최대+1, 매우 큰 길이, 0 길이, 잘못된 종류·버전, 연속 프레임을 테스트한다. 정상 프레임을 모든 분할 위치에서 나눠 입력하는 테스트도 포함한다. 퍼징과 AddressSanitizer, UndefinedBehaviorSanitizer를 사용하고 메모리·CPU 상한을 확인한다.

## 면접용 모범 답변

길이 필드도 신뢰할 수 없는 입력으로 보겠습니다. 헤더가 완성됐는지 확인하고 길이 상한과 실제 수신 크기를 검증한 후 할당과 복사를 수행하겠습니다. 부분 수신과 잘못된 형식을 구분하고 오버플로를 피하는 경계 검사를 사용하겠습니다. 연결별·전체 자원 예산과 타임아웃을 적용하고 경계값 테스트와 퍼징으로 검증하겠습니다.

## 참고 자료

- [MITRE CWE-190: 정수 오버플로](https://cwe.mitre.org/data/definitions/190.html)
- [MITRE CWE-125: 버퍼 범위 밖 읽기](https://cwe.mitre.org/data/definitions/125.html)
