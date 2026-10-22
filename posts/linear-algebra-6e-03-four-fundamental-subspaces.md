---
title: "03: 네 가지 기본 부분공간"
description: "열공간, 행공간, 영공간과 왼쪽 영공간으로 해의 구조를 정리한다."
date: "2026-10-21"
order: 3
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

## 3.1 벡터공간과 부분공간

실수 벡터공간의 부분공간은 덧셈과 실수배에 대해 닫혀 있다.
영벡터를 포함하는지도 먼저 확인한다.
원점을 지나는 직선은 부분공간이지만 원점에서 떨어진 평행선은 아니다.

$$
\begin{gathered}
S=\{(t,2t):t\in\mathbb R\}\\(t,2t)+(s,2s)=(t+s,2(t+s))\\c(t,2t)=(ct,2ct)
\end{gathered}
$$

두 연산 후에도 같은 형태를 유지하므로 $S$는 부분공간이다.
반면 $x+y=1$은 $(0,0)$을 포함하지 않는다.
$Ax=0$의 해집합은 언제나 부분공간이다.
$Ax=b$의 해집합은 일반적으로 부분공간이 아닌 평행이동된 공간이다.
이 구분이 동차방정식과 비동차방정식을 나눈다.

## 3.2 소거로 영공간 구하기: A = CR

1장에서 쓴 행렬을 다시 사용한다.
소거는 $Ax=0$의 해를 보존하므로 피벗과 자유변수로 영공간을 찾는다.

$$
\begin{gathered}
A=\begin{bmatrix}1&2&3\\0&1&1\end{bmatrix}\longrightarrow\begin{bmatrix}1&0&1\\0&1&1\end{bmatrix}\\x_3=t,\quad x_1=-t,\quad x_2=-t\\N(A)=\left\{t\begin{bmatrix}-1\\-1\\1\end{bmatrix}:t\in\mathbb R\right\}
\end{gathered}
$$

셋째 열이 첫째 열과 둘째 열의 합이라는 관계를 해로 읽은 것이다.
$A=CR$에서 $C$의 열이 독립이면 $CRx=0$과 $Rx=0$은 동치다.
따라서 계수 관계를 보관한 작은 행렬에서 영공간을 계산할 수 있다.
여기서 $R=\begin{bmatrix}1&0&1\\0&1&1\end{bmatrix}$이다.
소거 후의 피벗 열 위치를 찾고, 열공간 기저는 원래 $A$에서 고른다.
소거된 행렬의 열을 원래 열공간의 기저로 가져오는 실수를 주의한다.

## 3.3 Ax = b의 완전한 해

특수해 하나에 영공간 전체를 더하면 모든 해를 얻는다.
두 해의 차이를 $A$에 곱하면 우변이 상쇄되어 0이 되기 때문이다.

$$
\begin{gathered}
b=\begin{bmatrix}4\\1\end{bmatrix},\quad x_p=\begin{bmatrix}2\\1\\0\end{bmatrix},\quad Ax_p=\begin{bmatrix}4\\1\end{bmatrix}\\x=\begin{bmatrix}2\\1\\0\end{bmatrix}+t\begin{bmatrix}-1\\-1\\1\end{bmatrix},\quad t\in\mathbb R
\end{gathered}
$$

직접 대입하면 $x_1+2x_2+3x_3=4$, $x_2+x_3=1$이다.
자유변수 $t$가 달라도 출력은 같다.
이 예제는 열공간이 $\mathbb R^2$이므로 모든 2차원 우변에 해가 있다.
하지만 열이 셋이고 랭크가 2이므로 해가 유일하지는 않다.
일반적으로 해의 존재와 유일성은 서로 다른 질문이다.
존재는 열공간, 유일성은 영공간이 결정한다.

## 3.4 독립, 기저, 차원

벡터들이 독립이라는 것은 영벡터를 만드는 계수가 모두 0뿐이라는 뜻이다.
기저는 독립이면서 대상 공간 전체를 생성하는 벡터 모음이다.
차원은 기저에 들어가는 벡터의 수다.

$$
\begin{gathered}
\mathcal B_{C(A)}=\left\{\begin{bmatrix}1\\0\end{bmatrix},\begin{bmatrix}2\\1\end{bmatrix}\right\}\\\mathcal B_{C(A^{\mathsf T})}=\left\{\begin{bmatrix}1\\2\\3\end{bmatrix},\begin{bmatrix}0\\1\\1\end{bmatrix}\right\}\\\mathcal B_{N(A)}=\left\{\begin{bmatrix}-1\\-1\\1\end{bmatrix}\right\}
\end{gathered}
$$

기저는 여러 개지만 한 공간의 차원은 같다.
기저가 정해지면 그 공간의 모든 벡터는 유일한 좌표를 갖는다.
중복된 열을 추가해도 생성하는 공간이나 차원이 늘지는 않는다.
벡터 자체의 성분 수와 그 벡터들이 만드는 공간의 차원을 구별한다.
위 행공간 기저는 각 행을 전치한 열벡터로 표시했다.

## 3.5 네 부분공간의 차원

$m\times n$ 행렬의 랭크를 $r$이라고 하자.
행공간과 열공간은 주변 공간이 달라도 차원이 모두 $r$이다.

$$
\begin{gathered}
C(A)\subseteq\mathbb R^m,\quad \dim C(A)=r\\N(A^{\mathsf T})\subseteq\mathbb R^m,\quad \dim N(A^{\mathsf T})=m-r\\C(A^{\mathsf T})\subseteq\mathbb R^n,\quad \dim C(A^{\mathsf T})=r\\N(A)\subseteq\mathbb R^n,\quad \dim N(A)=n-r\\(m,n,r)=(2,3,2)\ \Longrightarrow\ (r,m-r,r,n-r)=(2,0,2,1)
\end{gathered}
$$

왼쪽 영공간 $N(A^{\mathsf T})$은 모든 열에 수직인 출력 공간의 벡터들이다.
이 예제에서는 열공간이 출력 공간 전체라 왼쪽 영공간은 $\{0\}$이다.
행공간의 두 기저 벡터와 $(-1,-1,1)$의 내적은 각각 0이다.
차원 공식은 다음 장의 직교 관계로 다시 연결된다.
게임의 중복 제약을 생각할 때도 방정식 개수보다 독립 제약 개수가 중요하다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** 랭크 2인 2×3 행렬의 영공간 차원은?

**짧은 답.** 3-2=1이다. 열공간 차원은 2, 왼쪽 영공간 차원은 0이다.

## 함께 볼 공개 자료

[MIT OCW — 네 기본 부분공간](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/the-four-fundamental-subspaces/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
