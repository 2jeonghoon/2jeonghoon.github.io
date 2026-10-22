---
title: "05: 행렬식과 부피"
description: "여인수, 소거와 행렬식 성질, 넓이와 부피의 변화를 연결한다."
date: "2026-10-19"
order: 5
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra", "Mathematics", "Study Notes"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=linear-algebra-6e-overview)

[6판 공식 목차](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)의 순서로 개념을 재구성한 개인 공부 노트다. 공개 목차와 MIT 강의 자료를 참고했으며 책 전체 본문을 읽고 축약한 글은 아니다. 계산과 연습 예제는 직접 구성했다.

기본은 실수 열벡터이며 $A^{\mathsf T}$는 전치다. 행렬은 대괄호 안에 행과 열을 맞추어 표시한다.

## 5.1 3×3 행렬식과 여인수

행렬식은 정사각행렬에 스칼라 하나를 대응시킨다.
크기는 부피 배율을, 부호는 방향 보존 또는 반전을 나타낸다.
여인수는 한 행과 한 열을 지운 작은 행렬식에 부호를 붙인 것이다.

$$
\begin{gathered}
A=\begin{bmatrix}2&1&0\\0&3&1\\1&0&2\end{bmatrix}\\\det A=2(3\cdot2-1\cdot0)-1(0\cdot2-1\cdot1)+0=12+1=13\\C_{11}=6,\quad C_{12}=1,\quad C_{13}=-3
\end{gathered}
$$

여인수의 부호판은 첫 줄이 $+ - +$, 다음 줄이 $- + -$다.
예제의 $C_{12}$는 소행렬식 -1에 음의 부호가 붙어 +1이다.
어느 행이나 열을 따라 전개해도 같은 답이다.
0이 많은 행을 고르면 손계산을 줄일 수 있다.
$n\times n$ 일반 행렬에 재귀적인 여인수 전개를 쓰면 계산량이 매우 커진다.
작은 행렬의 원리를 배우는 도구와 큰 행렬의 계산법을 구분한다.

### 직접 다른 열로 확인

세 번째 열은 $(0,1,2)$다.
$C_{23}=-\det(\begin{bmatrix}2&1\\1&0\end{bmatrix})=1$이다.
$C_{33}=\det(\begin{bmatrix}2&1\\0&3\end{bmatrix})=6$이다.
따라서 세 번째 열 전개도 $0+1\times 1+2\times 6=13$이다.
동일한 값이 나오는지 확인하면 부호 실수를 발견하기 좋다.

## 5.2 행렬식의 계산과 사용

삼각행렬의 행렬식은 대각성분의 곱이다.
행에 다른 행의 배수를 더하는 연산은 행렬식을 바꾸지 않는다.
두 행 교환은 부호를 바꾸고 한 행의 $c$배는 행렬식도 $c$배로 만든다.

$$
\begin{gathered}
B=\begin{bmatrix}2&1\\4&3\end{bmatrix}\xrightarrow{R_2\leftarrow R_2-2R_1}U=\begin{bmatrix}2&1\\0&1\end{bmatrix}\\\det B=\det U=2\cdot1=2
\end{gathered}
$$

$\det(AB)=\det(A)\det(B)$이고 $\det(A^{\mathsf T})=\det(A)$다.
가역행렬에서는 $\det(A^{-1})=1/\det(A)$다.
정사각행렬이 가역일 필요충분조건은 행렬식이 0이 아닌 것이다.
행렬식 0은 열들이 종속이라 적어도 한 방향이 눌려 사라진다는 뜻이다.
하지만 행렬식의 절댓값만 보고 수치적 안정성을 판단할 수는 없다.

$$
\begin{gathered}
D=\operatorname{diag}(10^6,10^{-6}),\quad \det D=1\\\|De_1\|=10^6,\quad \|De_2\|=10^{-6}
\end{gathered}
$$

$D$는 부피를 보존하지만 각 방향을 균일하게 다루지 않는다.
선형계 풀이에서는 Cramer 공식보다 소거/분해가 보통 적절하다.
행렬식은 방정식의 구조를 설명하는 데 특히 유용하다.
$\det(A-\lambda I)=0$은 다음 장의 고유값을 찾는 조건이 된다.

## 5.3 행렬식으로 구하는 넓이와 부피

두 열벡터가 만드는 평행사변형의 넓이는 2×2 행렬식의 절댓값이다.
삼각형이면 그 절반이다.
세 열벡터가 만드는 평행육면체는 3×3 행렬식의 절댓값을 쓴다.

$$
\begin{gathered}
u=\begin{bmatrix}2\\1\end{bmatrix},\quad v=\begin{bmatrix}1\\3\end{bmatrix},\quad \begin{bmatrix}u&v\end{bmatrix}=\begin{bmatrix}2&1\\1&3\end{bmatrix}\\\det\begin{bmatrix}u&v\end{bmatrix}=2\cdot3-1\cdot1=5\\\text{평행사변형 넓이}=5,\quad \text{삼각형 넓이}=\frac52
\end{gathered}
$$

벡터의 순서를 뒤집으면 부호가 바뀌지만 넓이는 같다.
앞 절의 3×3 예제는 단위 정육면체를 부피 13의 평행육면체로 보낸다.
음수 행렬식의 변환은 좌표계의 손잡이 방향을 뒤집는다.
3D 모델에 한 축 -1 배율을 적용할 때 이를 떠올릴 수 있다.
다만 실제 앞면 판정은 렌더러의 좌표계와 winding 관례도 함께 확인한다.

### 직사각형 행렬이라면

3차원 속 두 벡터가 만드는 넓이에는 3×2 행렬의 행렬식을 직접 쓰지 않는다.
대신 Gram 행렬 $A^{\mathsf T} A$가 정사각형이므로 그 행렬식을 이용한다.

$$
\begin{gathered}
u=\begin{bmatrix}1\\0\\0\end{bmatrix},\quad v=\begin{bmatrix}1\\2\\0\end{bmatrix},\quad A=\begin{bmatrix}u&v\end{bmatrix}\\A^{\mathsf T}A=\begin{bmatrix}1&1\\1&5\end{bmatrix}\\\text{넓이}=\sqrt{\det(A^{\mathsf T}A)}=\sqrt4=2
\end{gathered}
$$

두 벡터가 평행하면 Gram 행렬식도 0이다.
이 공식은 내적과 부피를 연결해 준다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** 행렬식이 1이면 모든 벡터의 길이가 보존되는가?

**짧은 답.** 아니다. $\operatorname{diag}(10^6,10^{-6})$이 반례다. 길이 보존에는 직교 조건이 필요하다.

## 함께 볼 공개 자료

[MIT OCW — 역행렬과 부피](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/cramers-rule-inverse-matrix-and-volume/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
