---
title: "OT 프로토콜과 2바이트 길이 필드의 안전한 해석"
description: "산업 제어 통신의 의미와 big-endian 길이, 정렬과 부분 수신을 설명한다."
date: "2026-10-30"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "OT", "바이트 순서"]
draft: false
aiGenerated: true
---

## 오늘의 질문

OT 프로토콜의 2바이트 길이 필드를 읽었더니 수신 바이트가 00 10입니다. 프로토콜은 큰 바이트 순서(big-endian)를 사용합니다. 이를 uint16_t*로 변환해 바로 읽는 방식에 어떤 문제가 있을까요? 안전하게 해석하는 방법을 설명해 주세요.

## OT란

Operational Technology는 공장 설비, 발전·전력 장치, 건물 자동화 등 물리 환경을 감시하거나 제어하는 시스템과 기술이다. OT 프로토콜은 그런 장비가 측정값, 제어 명령과 상태를 교환하는 통신 규칙들의 통칭이며 하나의 특정 규격이 아니다.

~~~text
센서 → 온도 측정값 → 제어기
제어기 → 밸브 제어 명령 → 장치
~~~

어떤 전송 방식과 바이트 순서를 사용하는지는 개별 프로토콜 규격으로 정한다. OT라는 이유만으로 TCP나 big-endian이라고 가정하지 않는다. 이 질문에서는 big-endian 2바이트 길이를 명시적으로 가정한다.

## 길이 해석

바이트가 16진수 00 10이면 big-endian 값은 0x0010, 즉 16이다. little-endian 호스트에서 네이티브 uint16_t로 바로 읽으면 0x1000, 즉 4096으로 해석될 수 있다.

수신 버퍼를 uint16_t*로 강제 변환해 역참조하면 바이트 순서뿐 아니라 정렬과 C++ 객체 접근 규칙도 문제다. 2바이트가 실제 도착했는지 먼저 확인한다.

~~~cpp
// buffer가 unsigned char 바이트 배열이라고 가정
if (received < 2) {
    // TCP라면 헤더를 더 수신한 뒤 해석
    return;
}

std::uint16_t length = static_cast<std::uint16_t>(
    (static_cast<std::uint16_t>(buffer[0]) << 8)
    | static_cast<std::uint16_t>(buffer[1])
);
~~~

또는 memcpy로 정렬된 로컬 uint16_t에 2바이트를 복사한 뒤 ntohs로 변환한다. char의 부호 확장 문제도 피하도록 unsigned 바이트로 해석한다.

해석한 16이 본문 길이인지 헤더 포함 길이인지 규격에서 확인하고, 허용 상한과 실제 본문 수신량을 검증한 뒤 사용한다.

## 면접용 모범 답변

OT 프로토콜은 물리 설비의 상태와 제어 명령을 교환하는 통신 규칙입니다. 이 문제의 big-endian 00 10은 16입니다. 포인터 변환으로 바로 읽지 않고 최소 길이를 확인한 뒤 unsigned 바이트를 조합하거나 memcpy와 ntohs를 사용하겠습니다. 이후 규격의 길이 의미와 상한, 실제 수신 크기도 확인하겠습니다.

## 참고 자료

- [NIST: OT 보안 가이드](https://csrc.nist.gov/pubs/sp/800/82/r3/final)
- [Linux byteorder(3)](https://man7.org/linux/man-pages/man3/ntohs.3.html)
