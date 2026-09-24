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

The data is split in several dynamic datasets. The data is converted from manually exported or collected data from different sources.

### Logged plays

Play sessions are logged via BGStats, which is automatically synchronized with a BGG account. An export can be made directly from the BoardGameGeek website, this is however limited to a certain amount of records. From an [external tool](http://www.sheltonsonline.net/bggtools/getplays), the data can be retrieved per user with a few clicks. This export has the following naming structure:

`<username>-plays-<date retrieved>.csv`

For the following explanation and range description, the export `excali8ur-plays-2025-03-23.csv` is used. Content will vary a lot, depending on how (in)complete an user is logging their sessions.

| Column name | Datatype | Range | Description |
| --- | --- | --- | --- |
| play ID | Integer (unique) | 60623503 - 96946840 | It is an unique number, probably autoincremented for every logged play on BGG. |
| game ID | Integer | 45 - 432 | Unique board game identifier from BGG. |
| game name | Text | up to 37 chars | Name of the board game that was played. |
| date | Date | 01/01/2008 - 31/12/2024 | Play date stored as DD/MM/YYYY text. |
| location | Text | up to 20 chars | Location where the game was played. Over the years, the values changed ('Home' was previously shown as 'H.') |
| length | Float | 10.0 - 480.0 | Duration of the play in minutes. |
| comments | Text | up to 713 chars | Optional free-text notes about the play session. |
| player 1 username | Text | up to 11 chars | BGG username of player when linked to an account. |
| player 1 name | Text | up to 22 chars | Display name of player 1. |
| player 1 startposition | Integer | 1 - 8 | Starting position or turn order of player 1. |
| player 1 color | Text | up to 10 chars | Color assigned to player 1 in the game. |
| player 1 score | Integer | -9 - 336 | Numeric score for player 1. |
| player 1 new | Float | Binary flag (1=yes) | Indicating whether this was the first time player 1 played this game. |
| player 1 win | Boolean | Binary flag (1=yes). | Indicating whether player 1 won the game. |

The columns "player 1 username" till "player 1 win" are repeated for player 2 to player 8.

This data is however limited, since more information is stored in the BGStats app. An export from BGStats is also possible as a json file.


## Visual Encoding

## References

- Board Game Plays Export. (n.d.). Retrieved from http://www.sheltonsonline.net/bggtools/getplays

- BoardGameGeek. (n.d.). Retrieved from [https://boardgamegeek.com/

- Boumans, R. (2026). Github repository. Retrieved from https://github.com/Excali8ur/Meeplewood]

- Eerko. (n.d.). Board Game Stats. Retrieved from [https://www.bgstatsapp.com/]

- Gen Con. (n.d.). Retrieved from https://www.gencon.com/

- Spiel. (n.d.). Retrieved from https://www.spiel-essen.de/en/