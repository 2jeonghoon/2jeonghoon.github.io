---
title: "04: 직교와 최소제곱"
description: "직교 분해에서 투영, 최소제곱, QR과 의사역행렬까지 공부한다."
date: "2026-10-22"
order: 1
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra","Mathematics","Study Notes"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
[시리즈 학습 지도](/?post=linear-algebra-6e-overview)

[6판 공식 목차](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)의 순서로 개념을 재구성한 개인 공부 노트다. 공개 목차와 MIT 강의 자료를 참고했으며 책 전체 본문을 읽고 축약한 글은 아니다. 계산과 연습 예제는 직접 구성했다.

기본은 실수 열벡터이며 $A^{\mathsf T}$는 전치다. 행렬은 대괄호 안에 행과 열을 맞추어 표시한다.

## 4.1 벡터와 부분공간의 직교

두 실수 벡터가 직교한다는 말은 내적이 0이라는 뜻이다.
두 부분공간이 직교하려면 한쪽의 모든 벡터가 다른 쪽의 모든 벡터와 직교해야 한다.
기저 벡터 사이의 내적을 모두 검사하면 충분하다.

$$
\begin{gathered}
r_1=\begin{bmatrix}1\\2\\3\end{bmatrix},\quad r_2=\begin{bmatrix}0\\1\\1\end{bmatrix},\quad n=\begin{bmatrix}-1\\-1\\1\end{bmatrix}\\r_1^{\mathsf T}n=-1-2+3=0\\r_2^{\mathsf T}n=0-1+1=0
\end{gathered}
$$

행공간과 영공간은 같은 $\mathbb R^n$ 안에서 서로 직교한다.
열공간과 왼쪽 영공간은 같은 $\mathbb R^m$ 안에서 서로 직교한다.
단순히 서로 겹치는 벡터가 0뿐이라는 조건만으로 직교하지는 않는다.
예를 들어 $(1,0)$의 직선과 $(1,1)$의 직선은 교집합이 $\{0\}$이지만 직각은 아니다.
직교는 직접합보다 더 강한 기하 조건이다.

## 4.2 직선과 부분공간으로의 투영

$b$를 직선 $\operatorname{span}(a)$에 가장 가깝게 만드는 점을 찾는다.
남는 오차가 직선에 수직이라는 조건으로 계수를 결정한다.

$$
\begin{gathered}
a=\begin{bmatrix}1\\1\end{bmatrix},\quad b=\begin{bmatrix}3\\1\end{bmatrix}\\c=\frac{a^{\mathsf T}b}{a^{\mathsf T}a}=\frac42=2\\p=ca=\begin{bmatrix}2\\2\end{bmatrix},\quad e=b-p=\begin{bmatrix}1\\-1\end{bmatrix},\quad a^{\mathsf T}e=0\\P=\frac{aa^{\mathsf T}}{a^{\mathsf T}a}=\begin{bmatrix}\frac12&\frac12\\\frac12&\frac12\end{bmatrix}
\end{gathered}
$$

$P^2=P$이므로 한 번 투영한 점을 다시 투영해도 바뀌지 않는다.
이 직교투영은 $P^{\mathsf T}=P$도 만족한다.
독립인 열을 가진 $A$의 열공간에는 $P=A(A^{\mathsf T} A)^{-1}A^{\mathsf T}$로 투영한다.
열이 종속이면 이 역행렬 공식은 그대로 쓸 수 없다.
그때도 투영은 존재하며 의사역행렬로 표현할 수 있다.

## 4.3 최소제곱 근사

정확한 $Ax=b$가 불가능하면 $\|Ax-b\|^2$를 최소화한다.
최소점에서는 잔차가 모든 열에 수직이다.

$$
\begin{gathered}
A=\begin{bmatrix}1\\1\\1\end{bmatrix},\quad b=\begin{bmatrix}1\\2\\6\end{bmatrix}\\A^{\mathsf T}A=3,\quad A^{\mathsf T}b=9,\quad \widehat x=3\\b-A\widehat x=\begin{bmatrix}-2\\-1\\3\end{bmatrix},\quad -2-1+3=0\\\|b-A\widehat x\|^2=4+1+9=14
\end{gathered}
$$

이는 세 관측값에 같은 상수 하나를 맞추는 문제다.
정규방정식은 $A^{\mathsf T} A \widehat x=A^{\mathsf T} b$다.
독립인 열이면 해가 유일하다.
열이 종속이면 최소제곱 해가 여럿일 수 있지만 투영된 출력은 유일하다.
실제 계산에서 $A^{\mathsf T} A$는 조건수를 제곱하므로 QR이나 SVD가 유리할 수 있다.
관측 오차가 큰 점을 자동으로 무시하는 방법은 아니라는 점도 기억한다.

## 4.4 정규직교 기저와 Gram–Schmidt

직교한 벡터를 길이 1로 만들면 정규직교 벡터가 된다.
Gram–Schmidt는 이미 구한 방향의 투영을 새 벡터에서 뺀다.

$$
\begin{gathered}
a_1=\begin{bmatrix}1\\1\end{bmatrix},\quad a_2=\begin{bmatrix}1\\0\end{bmatrix},\quad q_1=\frac1{\sqrt2}\begin{bmatrix}1\\1\end{bmatrix}\\v_2=a_2-q_1(q_1^{\mathsf T}a_2)=\begin{bmatrix}\frac12\\-\frac12\end{bmatrix},\quad q_2=\frac1{\sqrt2}\begin{bmatrix}1\\-1\end{bmatrix}\\R=\begin{bmatrix}\sqrt2&1/\sqrt2\\0&1/\sqrt2\end{bmatrix}\\A=\begin{bmatrix}a_1&a_2\end{bmatrix}=QR,\quad Q=\begin{bmatrix}q_1&q_2\end{bmatrix}
\end{gathered}
$$

$Q^{\mathsf T} Q=I$이므로 정규직교 좌표에서는 내적만으로 좌표를 얻는다.
$QR$의 $R$은 원래 열을 정규직교 기저로 조합하는 계수다.
새 벡터가 기존 span에 있으면 뺀 결과가 0이 되어 정규화할 수 없다.
부동소수점에서는 수정 Gram–Schmidt나 Householder QR을 고려한다.

## 4.5 의사역행렬

Moore–Penrose 의사역행렬 $A^+$는 직사각형과 특이행렬에도 정의된다.
$x=A^+b$는 최소제곱 해들 가운데 유클리드 노름이 가장 작은 해다.

$$
\begin{gathered}
A=\begin{bmatrix}1&1\end{bmatrix},\quad b=2,\quad A^+=\begin{bmatrix}\frac12\\\frac12\end{bmatrix}\\x=A^+b=\begin{bmatrix}1\\1\end{bmatrix},\quad Ax=2\\x(t)=\begin{bmatrix}1+t\\1-t\end{bmatrix},\quad \|x(t)\|^2=2+2t^2
\end{gathered}
$$

노름이 최소인 시점은 $t=0$이다.
$AA^+$는 열공간, $A^+A$는 행공간으로의 직교투영이다.
가역 정사각행렬에서만 의사역행렬이 보통의 역행렬과 일치한다.
수치적으로 작은 특잇값을 0으로 볼 기준은 데이터 오차와 함께 정해야 한다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** 최소제곱 해가 여러 개면 투영된 출력도 여러 개인가?

**짧은 답.** 아니다. 최적 출력은 유일하며 의사역행렬은 해 가운데 최소노름 해를 고른다.

## 함께 볼 공개 자료

[MIT OCW — 투영행렬과 최소제곱](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/projection-matrices-and-least-squares/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
