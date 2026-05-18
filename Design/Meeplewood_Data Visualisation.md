# Data Visualisation

![MeepleWood Banner](img/Meeplewood_Banner.png)

## Table of Contents

- [Introduction](#introduction)
- [Project Overview & Motivation](#project-overview--motivation)
- [Data abstraction](#data-abstraction)
- [Visual Encoding](#visual-encoding)
- [References](#references)

## Introduction

## Project Overview & Motivation

## Data abstraction

### Data Sources and structure

The data is a dynamic dataset, manually exported or collected from 3 different sources.

### BGG Data

An export can be made directly from the BoardGameGeek website, this is however limited to a certain amount of records. From an [external tool](http://www.sheltonsonline.net/bggtools/getplays), the data can be retrieved with a few clicks. This export has the following naming structure:

`<username>-plays-<date retrieved>.csv`

For the following explanation and range description, the export `excali8ur-plays-2025-03-23.csv` is used.

| Column name | Datatype | Range | Description |
| --- | --- | --- | --- |
| play ID | Integer (unique) | 60623503 - 96946840 | It is an unique number, probably autoincremented for every logged play on BGG. |
| game ID | Integer | 45 - 432 | Identifier values for the game on BGG. |
| game name | Text | up to 37 chars | Name of the board game that was played. No missing values. |
| date | Text (date format) | 01/01/2008 - 31/12/2024 | Play date stored as DD/MM/YYYY text. No missing values. |
| location | Text | up to 20 chars | Optional location where the game was played. 134 missing values. |
| length | Float | 10.0 - 480.0 | Duration of the play in minutes. 390 missing values. |
| comments | Text | up to 713 chars | Optional free-text notes about the play session. |
| player 1 username | Text | up to 11 chars | BGG username of player when linked to an account. |
| player 1 name | Text | up to 22 chars | Display name of player 1. |
| player 1 startposition | Integer | 1 - 8 | Starting position or turn order of player 1. |
| player 1 color | Text | up to 10 chars | Color assigned to player 1 in the game. |
| player 1 score | Integer | -9 - 336 | Numeric score for player 1. |
| player 1 new | Float | Binary flag (1=yes) | Indicating whether player 1 was new to the game. |
| player 1 win | Boolean | Binary flag (1=yes). | Indicating whether player 1 won the game. |

The columns "player 1 username" till "player 1 win" are repeated for player 2 to player 8.

## Visual Encoding

## References

- Board Game Plays Export. (n.d.). Retrieved from http://www.sheltonsonline.net/bggtools/getplays

- BoardGameGeek. (n.d.). Retrieved from [https://boardgamegeek.com/

- Boumans, R. (2026). Github repository. Retrieved from https://github.com/Excali8ur/Meeplewood]

- Eerko. (n.d.). Board Game Stats. Retrieved from [https://www.bgstatsapp.com/]

- Gen Con. (n.d.). Retrieved from https://www.gencon.com/

- Spiel. (n.d.). Retrieved from https://www.spiel-essen.de/en/