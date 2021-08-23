# 基于规格的测试设计

## 等价类划分\(Equivalence Partitioning\)

### 用法

#### Feature Set -&gt; Test Condition

等价类划分把被测对象输入和输出进行等价划分，每个等价划分作为一个测试规格；

应根据测试依据进行等价划分，每个划分下输入的处理是类似的；

常使用等价划分把输入和输出分为有效和无效两个类型；

只有输出等价划分时，可以根据测试规格书中所描述的处理过程，推导出对应的输入等价划分；

#### Test Condition -&gt; Test Coverage Item

每个等价划分都是一个测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：一条用例覆盖一个覆盖项、一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试度量

等价划分覆盖 = 测试用例覆盖的等价划分数 / 等价划分总数；

## [分类树\(Classification Tree Method\)](https://aneejian.com/classification-tree-method-crack-istqb/#what-is-the-classification-tree-method)

### 用法

#### Feature Set -&gt; Test Condition

![](../../../../.gitbook/assets/image%20%28105%29.png)

分类树把被测对象的输入划分为多个类别，每个类别之间不重叠，并以树的形式进行展现；

分类树中的每个类别都是一个测试规格；

它和等价类划分的最大差异在于，分类树要求每个类型不可相交，等价划分是可以的；

#### Test Condition -&gt; Test Coverage Item



#### Test Coverage Item -&gt; Test Case

### 测试度量

## 边界值分析\(Boundary Value Analysis\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试度量

## 语法测试\(Syntax Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 组合测试设计技术\(Combinatorial Test Design Techniques\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 决策表测试\(Decision Table Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 因果图\(Cause-Effect Graphing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 状态迁移测试\(State Transition Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 场景测试\(Scenario Testing\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

## 随机测试\(RamdonTesting\)

### 用法

#### 用于推导测试规格

#### 用于推导测试覆盖项

#### 用于推导测试用例

### 测试度量

