# 基于结构的测试设计

## 语句测试\(Statement Testing\)

### 背景

对可执行语句进行覆盖；

### 用法

#### Feature Set -&gt; Test Condition

代码里面的每一条可执行语句都作为测试规格；

#### Test Condition -&gt; Test Coverage Item

每个测试规格直接作为测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 编写测试用例，覆盖一条尚未覆盖的控制流，此条控制流会执行一条或多条测试覆盖项;
2. 确定测试用例的输入参数，确保用例执行时控制流会被执行到；
3. 确定测试用例的输出结果；
4. 重复步骤1~3，直到覆盖所有测试覆盖项；

### 测试覆盖度量

语句测试覆盖率 = 测试用例覆盖的可执行语句 / 被测对象所有可执行语句；

## 分支测试\(Branch Testing\)

### 背景

对代码分支进行覆盖；

### 用法

#### Feature Set -&gt; Test Condition

为被测对象建立控制流模型，控制流模型中的每个控制流分支作为测试规格；

分支有：

* 从一个节点到另外一个节点的有条件控制转移；
* 从一个节点到另外一个节点的无条件控制转移；
* 当被测对象有多个入口点时，向入口点的控制转移；

注意事项：

* 100%的分支测试覆盖需要对控制流模型中的所有边进行覆盖；
* 分支测试既要测试无条件转移的控制流\(Entry/Exit Point\)，也要测试有条件转移的控制流\(if/switch\)；
* 语句中的函数调用不算做单独的控制流；

#### Test Condition -&gt; Test Coverage Item

每条控制流分支都作为一个测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 编写测试用例，覆盖一条尚未覆盖的控制流，此条控制流会执行一条或多条测试覆盖项;
2. 确定测试用例的输入参数，确保用例执行时控制流会被执行到；
3. 确定测试用例的输出结果；
4. 重复步骤1~3，直到覆盖所有测试覆盖项；

### 测试覆盖度量

分支测试覆盖率 = 测试用例覆盖的控制流分支数量 / 所有控制流分支数量；

## 判定测试\(Decision Testing\)

### 背景

对判定点进行覆盖；

### 用法

#### Feature Set -&gt; Test Condition

为被测对象建立控制流模型，控制流模型中的每个判定点作为测试规格；

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 分支条件测试\(Branch Condition Testing\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 分支条件组合测试\(Branch Condition Combination Testing\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 数据流测试\(Modified Condition Decision Coverage Testing\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 数据流测试\(Data Flow Testing\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

