---
title: "부록 1–10: 행렬 분해, 수치 계산과 그래픽스"
description: "6판 부록 순서에 맞춰 랭크, 분해, 매개변수 수, Jordan 형식, 텐서, 조건수, Markov 행렬과 그래픽스를 복습합니다."
date: "2026-10-19"
order: 11
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra", "Matrix Factorization", "Numerical Analysis", "Computer Graphics"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 안내](/?post=linear-algebra-6e-overview)

『Introduction to Linear Algebra』 6판의 공개 목차에 있는 부록 순서대로 공부할 개념을 모았다. 설명과 숫자 예제는 독립적으로 작성했으며, 공개되지 않은 부록 전체 본문의 번역이나 연습문제 해설이 아니다. 본문의 개념을 실제 계산으로 옮길 때 다시 찾아보는 참고 노트다.

## 부록 1. 곱과 합의 랭크

$A: m\times n$, $B: n\times p$이면 $AB$의 출력은 A의 열공간 안에 있다. 입력이 B를 거치며 잃은 독립 방향을 A가 되살릴 수도 없다. 따라서 $\operatorname{rank}(AB) \le  \min(\operatorname{rank}(A), \operatorname{rank}(B))$다.

곱의 랭크가 두 랭크 중 작은 값과 반드시 같지는 않다. B의 출력이 A의 영공간에 들어가면 모두 0이 될 수 있다.

$$
\begin{gathered}
A=\begin{bmatrix}1&0\end{bmatrix},\quad B=\begin{bmatrix}0\\1\end{bmatrix}\\\operatorname{rank}(A)=\operatorname{rank}(B)=1\\AB=\begin{bmatrix}0\end{bmatrix},\quad \operatorname{rank}(AB)=0
\end{gathered}
$$

같은 크기 행렬의 합은 $\operatorname{rank}(A+B) \le  \operatorname{rank}(A)+\operatorname{rank}(B)$를 만족한다. $B = -A$이면 양쪽에 독립 방향이 있어도 합은 0이다. 랭크는 원소별 절댓값이나 단순한 데이터 양과 다르다.

## 부록 2. 행렬 분해를 목적에 따라 고르기

| 분해 | 읽는 의미 | 전제와 용도 |
| --- | --- | --- |
| $A = CR$ | 독립 열과 그 조합 | 열공간과 랭크 설명 |
| $PA = LU$ | 행 교환 후 삼각 계수로 분해 | 선형계 풀이, 피벗 처리 |
| $A = QR$ | 직교 방향과 계수 | 최소제곱, 직교화 |
| $S = Q\Lambda Q^{\mathsf T}$ | 대칭행렬의 직교 고유 방향 | 실수 대칭행렬 |
| $A = U\Sigma V^{\mathsf T}$ | 입력·출력 방향과 크기 | 일반적인 실수 행렬의 SVD |

L과 U가 항상 피벗 없이 만들어진다고 단정하지 않는다. 또 QR의 얇은 형태와 전체 형태는 행렬 크기가 다르므로 곱셈의 shape을 확인한다. 복소수에서는 직교·전치 대신 유니터리·켤레전치에 맞춰 식을 읽는다.

분해의 목적은 기호를 늘리는 것이 아니라 반복 계산을 재사용하고 의미를 드러내는 데 있다. 같은 A에 여러 b를 풀 때는 매번 처음부터 소거하거나 역행렬을 만들기보다 분해를 재사용한다.

## 부록 3. 분해와 행렬의 자유도

일반적인 $m\times n$ 실수 행렬의 원소는 mn개다. 랭크 r이 고정된 행렬들의 자유도는 $r(m+n-r)$로 센다. 분해의 인자에 적힌 모든 숫자가 서로 독립적인 매개변수는 아니라는 점이 핵심이다.

예를 들어 $3\times 4$, 랭크 2인 행렬은 $2\times (3+4-2) = 10$의 자유도를 가진다. 아무 제약 없는 $3\times 4$ 행렬의 12개 원소와 다르다. 랭크가 정확히 r인 범위의 구조를 세는 식이지, 모든 특이점이 매끈하게 같은 좌표로 표현된다는 뜻은 아니다.

실수 대칭 $n\times n$ 행렬은 대각선과 한쪽 삼각 부분만 정하면 되어 $\frac{n(n+1)}2$개가 필요하다. 직교행렬은 열 사이의 길이·직교 제약을 만족해야 하므로 자유도가 $\frac{n(n-1)}2$다. 3D 회전의 연속 자유도 3과 3×3 저장 원소 9개를 구별하는 이유가 여기에 있다.

## 부록 4. 수치 선형대수 코드와 알고리즘

수학적으로 같은 식도 컴퓨터에서의 계산 경로는 다르다. $Ax=b$를 풀 목적이라면 역행렬을 직접 계산해 b에 곱하는 것보다 적절한 선형계 풀이를 사용한다. 최소제곱에서도 정규방정식은 개념 설명에는 편하지만 2-노름 조건수를 제곱하는 문제가 있어 QR이나 SVD를 검토한다.

작은 피벗을 발견했을 때는 단순히 0과 같은지 비교하기보다 스케일·피벗 전략·요구 정확도를 살핀다. 희소행렬을 다룰 때는 채워짐과 저장 구조도 비용의 일부다.

$$
\begin{gathered}
r=b-A\widehat x\\\text{후방 오차: }\ (A+\Delta A)\widehat x=b+\Delta b\\\text{전방 오차: }\ \|\widehat x-x\|
\end{gathered}
$$

작은 잔차만으로 작은 해 오차를 보장할 수는 없다. 특히 거의 특이한 행렬에서는 조건수를 함께 본다. 구현에서는 재현 가능한 작은 테스트와 검증된 수치 라이브러리를 사용한다.

## 부록 5. Jordan 형식

고유값을 구했다고 언제나 고유벡터 기저가 생기는 것은 아니다. 고유값이 반복될 때 독립 고유벡터 수가 부족할 수 있다. Jordan 형식은 이런 행렬을 일반화된 고유벡터로 설명한다.

$$
\begin{gathered}
J=\begin{bmatrix}1&1\\0&1\end{bmatrix},\quad J^k=\begin{bmatrix}1&k\\0&1\end{bmatrix},\quad k\in\mathbb Z_{\ge0}\\(J-I)x=0\ \Longleftrightarrow\ x_2=0\\\ker(J-I)=\operatorname{span}\left\{\begin{bmatrix}1\\0\end{bmatrix}\right\}
\end{gathered}
$$

위 예제는 고유값이 모두 1이어도 반복 적용 결과가 일정하게 유지되는 것은 아님을 보여 준다. 비대각 항 때문에 크기가 k에 비례해 자랄 수 있다. 수치 계산에서는 작은 교란에 민감한 Jordan 블록을 그대로 계산 목표로 삼기보다 안정적인 분해와 알고리즘을 선택한다. [MIT 강의의 대각화·Jordan 형식 설명](https://github.com/mitmath/1806)

## 부록 6. 텐서

스칼라, 벡터, 행렬을 넘어 여러 축의 자료와 다중선형 관계를 표현할 때 텐서가 등장한다. 배열의 차수는 축의 개수이고 각 축의 길이는 별도다. 머신러닝에서 말하는 저장 배열의 rank와 행렬의 선형대수적 랭크를 같은 용어라고 착각하지 않는다.

물리의 텐서는 좌표를 바꿀 때 성분이 어떻게 변하는지도 중요하다. 예를 들어 관성 텐서는 각속도와 각운동량을 연결한다. 직교 회전 R로 몸체 좌표의 관성을 월드 좌표로 옮기면 $I_{\mathrm{world}} = R I_{\mathrm{body}} R^{\mathsf T}$ 형태로 쓴다.

$$
\begin{gathered}
I_{\mathrm{body}}=\operatorname{diag}(1,2,3),\quad R=\begin{bmatrix}0&-1&0\\1&0&0\\0&0&1\end{bmatrix}\\I_{\mathrm{world}}=RI_{\mathrm{body}}R^{\mathsf T}=\operatorname{diag}(2,1,3)
\end{gathered}
$$

회전으로 x·y 방향이 바뀌었지만 물체 자체의 관성 성질이 바뀐 것은 아니다. 게임 물리에서 행렬의 성분과 물리적인 객체를 구분해야 하는 예다.

## 부록 7. 조건수

가역행렬의 2-노름 조건수는 $\kappa_2(A)=\frac{\sigma_{\max}}{\sigma_{\min}}$이다. 입력 오차가 출력 해에 얼마나 증폭될 수 있는지 판단하는 도구다. 조건수는 문제의 민감도이고, 사용하는 알고리즘의 안정성은 별도 문제다.

$A = \operatorname{diag}(1, 0.0001)$이면 조건수는 10000이다. 둘째 방향은 작은 입력 변화를 해의 큰 변화로 바꾼다. 정방 특이행렬은 역문제에서 유한한 조건수로 다룰 수 없다.

행렬식이 작다는 말과 나쁜 조건수는 같은 기준이 아니다. $0.001 I$의 행렬식은 차원에 따라 아주 작아져도 2-노름 조건수는 1이다. 단위와 전체 크기 변화와 방향 사이의 상대적인 찌그러짐을 구분한다.

## 부록 8. Markov 행렬과 장기 상태

이 노트는 **열의 합이 1인** 비음수 행렬과 열 확률벡터를 사용해 $p_{\mathrm{next}} = Pp$로 갱신한다. 행 확률벡터를 쓰는 자료와는 전치 관계를 확인한다.

$$
\begin{gathered}
P=\begin{bmatrix}0.9&0.2\\0.1&0.8\end{bmatrix},\quad p=\begin{bmatrix}2/3\\1/3\end{bmatrix}\\Pp=\begin{bmatrix}0.9\cdot\frac23+0.2\cdot\frac13\\0.1\cdot\frac23+0.8\cdot\frac13\end{bmatrix}=\begin{bmatrix}2/3\\1/3\end{bmatrix}=p
\end{gathered}
$$

정상 상태는 고유값 1에 대응한다. 모든 초기 상태가 유일한 정상 상태로 수렴하는지는 추가 조건이 필요하다. 유한 상태에서 기약성과 비주기성 등을 확인하며, 단순히 각 열의 합이 1이라는 사실만으로 수렴을 단정하지 않는다. 게임의 상태 전이 예에도 적용할 수 있지만 플레이어 행동 모델이 실제로 Markov 가정을 만족하는지는 별도다. [MIT의 Markov 행렬 강의](https://www.ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-videos/)

## 부록 9. 소거와 분해를 다시 연결하기

행 연산은 연립방정식을 동치인 형태로 바꾼다. 가역인 행 연산을 A에 적용하면 영공간과 행공간은 유지되지만 열공간은 원래 공간 안에서 바뀔 수 있다. 소거된 행렬의 열을 그대로 원래 A의 열공간 기저로 고르지 않는다.

독립 열의 위치를 소거로 찾았다면 **원래 A에서 그 위치의 열**을 선택해 C를 만든다. R은 각 열을 C로 조합하는 계수다. 같은 문자 R이 QR의 삼각행렬에도 쓰이므로 분해 문맥을 함께 적는다.

피벗 수, 자유변수 수, 해의 존재 조건을 함께 확인하면 단순한 계산 절차가 부분공간의 구조로 연결된다. 3장의 네 부분공간으로 돌아가 차원이 맞는지 확인한다.

## 부록 10. 컴퓨터 그래픽스

선형변환은 원점을 보존한다. 평행이동은 일반적인 3D 선형변환이 아니지만 동차좌표를 도입하면 4×4 행렬로 표현할 수 있다. 점은 마지막 좌표 1, 방향은 0으로 두어 평행이동의 영향을 구별한다.

열벡터 약속에서 $p_{\mathrm{world}} = T R S p_{\mathrm{local}}$이면 오른쪽의 스케일부터 적용한다. z축 90° 회전 R과 $S=\operatorname{diag}(2,1,1)$을 생각해 보자.

$$
\begin{gathered}
p=\begin{bmatrix}1\\0\\0\end{bmatrix},\quad RSp=\begin{bmatrix}0\\2\\0\end{bmatrix},\quad SRp=\begin{bmatrix}0\\1\\0\end{bmatrix}
\end{gathered}
$$

행렬곱 순서는 교환되지 않는다. 또한 법선은 일반적인 비균일 스케일 아래에서 위치·접선과 같은 방식으로 곱하면 직교성이 깨질 수 있다. 가역인 선형 부분 A에서는 법선을 $(A^{-1})^{\mathsf T}$로 변환하고 필요한 경우 정규화한다. 특이한 변환에는 역행렬 공식을 사용할 수 없다. [그래픽스 교재의 법선 변환 설명](https://math.hws.edu/graphicsbook/c7/s1.html)

게임 엔진의 행벡터·열벡터 약속, 저장 순서, 왼손·오른손 좌표계는 서로 다른 선택이다. 메모리의 row-major 저장과 행벡터 연산을 같은 뜻으로 쓰지 않는다. [3D Math Primer의 행벡터 약속](https://gamemath.com/book/matrixintro.html)은 이 노트의 열벡터 약속과 다르므로 식을 그대로 섞지 않는다.

## 복습 질문과 짧은 답

- **두 행렬이 모두 랭크 1이면 곱도 랭크 1인가?** 아니다. B의 출력이 A의 영공간에 들어가면 0이다.
- **행렬식이 아주 작으면 무조건 조건수가 나쁜가?** 아니다. 스칼라배 항등행렬의 예가 반례다.
- **소거 후 피벗 열을 원래 열공간의 기저로 쓸 수 있는가?** 위치만 얻고 실제 열은 원래 A에서 선택한다.
- **평행이동은 원래 3D 공간에서 선형인가?** 아니다. 동차좌표의 확장 표현과 구분한다.

## 참고 자료

- [6판 공식 목차와 샘플](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)
- [MIT 18.06 공식 강의 저장소](https://github.com/mitmath/1806)
- [MIT 18.06SC: 응용 주제](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/positive-definite-matrices-and-applications/)
- [저자 공개 게임 수학 교재](https://gamemath.com/book/)
