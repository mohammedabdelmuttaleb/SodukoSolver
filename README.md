AI Sudoku Solver (CSP & DFS)

An intelligent Sudoku solver built in Python that formulates the classic puzzle as a Constraint Satisfaction Problem (CSP) and solves it using Depth-First Search (DFS) with backtracking and advanced heuristics.

Overview

Sudoku is more than just a newspaper game; it's a classic example of an NP-complete problem. This project demonstrates how Artificial Intelligence can solve complex combinatorial problems efficiently. By treating the Sudoku grid as a Constraint Satisfaction Problem, this solver avoids brute-force guessing and instead uses logical deduction and optimized search strategies to find the solution in milliseconds.

Features

CSP Formulation: Accurately models the rules of Sudoku (row, column, and 3x3 grid constraints).
Backtracking Search: Uses a highly optimized Depth-First Search (DFS) to navigate the state space.
Minimum Remaining Values (MRV): Prioritizes cells with the fewest legal moves to prune the search tree early.
Forward Checking: Dynamically updates the possible values for remaining empty cells after every move.


Setup
Clone the repository:
   git clone [Sudoku Solver](https://github.com/Dedmo77/Sudoku-Solver.git)
