import type { Question } from "../types";

export const questions: Question[] = [
  {
    question_id: "Q001",
    title: "Two Sum",
    description: "Given an array of integers, find two numbers whose sum equals the target.",
    topic: "Arrays",
    ctc_band: "10_LPA",
    difficulty: "Easy",
    constraints: [
      "1 <= n <= 10^5",
      "-10^9 <= arr[i] <= 10^9"
    ],
    sample_test_cases: [
      {
        input: "2 7 11 15\n9",
        output: "0 1"
      },
      {
        input: "3 2 4\n6",
        output: "1 2"
      }
    ]
  },

  {
    question_id: "Q002",
    title: "Longest Substring",
    description: "Find the length of the longest substring without repeating characters.",
    topic: "Strings",
    ctc_band: "10_LPA",
    difficulty: "Medium",
    constraints: [
      "1 <= s.length <= 10^5",
      "s contains printable characters"
    ],
    sample_test_cases: [
      {
        input: "abcabcbb",
        output: "3"
      },
      {
        input: "bbbbb",
        output: "1"
      }
    ]
  },

  {
    question_id: "Q003",
    title: "Binary Tree Height",
    description: "Find the height of a binary tree.",
    topic: "Trees",
    ctc_band: "10_LPA",
    difficulty: "Medium",
    constraints: [
      "1 <= number of nodes <= 10^5"
    ],
    sample_test_cases: [
      {
        input: "1 2 3 4 5",
        output: "3"
      }
    ]
  },

  {
    question_id: "Q004",
    title: "Shortest Path",
    description: "Find the shortest path between two vertices in a weighted graph.",
    topic: "Graphs",
    ctc_band: "10_LPA",
    difficulty: "Hard",
    constraints: [
      "1 <= V <= 10^5",
      "1 <= E <= 2 * 10^5"
    ],
    sample_test_cases: [
      {
        input: "4 4\n1 2 5\n2 3 2\n1 3 10\n3 4 1",
        output: "8"
      }
    ]
  },

  {
    question_id: "Q005",
    title: "Coin Change",
    description: "Find the minimum number of coins required to make a given amount.",
    topic: "Dynamic Programming",
    ctc_band: "10_LPA",
    difficulty: "Medium",
    constraints: [
      "1 <= amount <= 10^4",
      "1 <= number of coins <= 100"
    ],
    sample_test_cases: [
      {
        input: "1 2 5\n11",
        output: "3"
      }
    ]
  },

  {
    question_id: "Q006",
    title: "Maximum Subarray",
    description: "Find the contiguous subarray with the maximum sum.",
    topic: "Arrays",
    ctc_band: "10_LPA",
    difficulty: "Medium",
    constraints: [
      "1 <= n <= 10^5",
      "-10^4 <= arr[i] <= 10^4"
    ],
    sample_test_cases: [
      {
        input: "-2 1 -3 4 -1 2 1 -5 4",
        output: "6"
      }
    ]
  },

  {
    question_id: "Q007",
    title: "Graph Traversal",
    description: "Traverse all reachable vertices of an undirected graph.",
    topic: "Graphs",
    ctc_band: "10_LPA",
    difficulty: "Easy",
    constraints: [
      "1 <= V <= 10^5",
      "1 <= E <= 2 * 10^5"
    ],
    sample_test_cases: [
      {
        input: "4 3\n1 2\n2 3\n3 4",
        output: "1 2 3 4"
      }
    ]
  },

  {
    question_id: "Q008",
    title: "Longest Common Subsequence",
    description: "Find the length of the longest common subsequence of two strings.",
    topic: "Dynamic Programming",
    ctc_band: "10_LPA",
    difficulty: "Hard",
    constraints: [
      "1 <= n, m <= 1000"
    ],
    sample_test_cases: [
      {
        input: "abcde\nace",
        output: "3"
      }
    ]
  }
];