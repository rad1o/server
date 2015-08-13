DROP TABLE IF EXISTS TA_MESSAGE_BADGE;
DROP TABLE IF EXISTS TA_MESSAGE;
DROP TABLE IF EXISTS TA_BADGE_CHALLENGE;
DROP TABLE IF EXISTS TA_CHALLENGE;
DROP TABLE IF EXISTS TA_FIRMWARE;
DROP TABLE IF EXISTS TA_LOCATION;
DROP TABLE IF EXISTS TA_BADGE;

DROP TABLE IF EXISTS MV_HIGHSCORE;

SET NAMES 'utf8';
SET CHARACTER SET 'utf8';

CREATE TABLE TA_BADGE (
	sp_oid				integer 		NOT NULL AUTO_INCREMENT,
	sp_badge_id			varchar(32) 	not NULL,
	sp_badge_key		varchar(32)		default NULL,
	sp_nickname			varchar(32)		default NULL,
	sp_callsign			varchar(32)		default NULL,
	sp_password			varchar(64)		default NULL,
	sp_email			varchar(100)	default NULL,
	sp_register_time	timestamp		default 0,
	sp_last_seen		timestamp		default 0,
	sp_comment			varchar(300)	default NULL,
	sp_icon				blob			default NULL,
	fk_firmware			integer			default NULL,
	CONSTRAINT PK_OID PRIMARY KEY (sp_oid),
	UNIQUE (sp_badge_id)
);

CREATE TABLE TA_CHALLENGE (
	sp_oid				integer 		NOT NULL AUTO_INCREMENT,
	sp_number			integer			not NULL,
	sp_class			varchar(32)		not NULL,				
	sp_title			varchar(32)		not NULL,
	sp_description		varchar(1000)	not NULL,
	sp_points			integer			not NULL,
	sp_credits			varchar(200)	default NULL,
	sp_create_time		TIMESTAMP 		DEFAULT CURRENT_TIMESTAMP,
	sp_last_changed		timestamp		default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	sp_answer1			varchar(50)		default NULL,
	sp_answer2			varchar(50)		default NULL,
	sp_answer3			varchar(50)		default NULL,
	sp_answer4			varchar(50)		default NULL,
	sp_correct_answer	integer			default NULL,
	sp_hint				varchar(200)	default NULL,
	sp_image			blob			default NULL,
	sp_secret			varchar(32)		default NULL,
	sp_comment			varchar(300)	default NULL,	
	fk_location			integer			default NULL,
	fk_previous			integer			default NULL,
	fk_next				integer			default NULL,
	CONSTRAINT PK_OID PRIMARY KEY (sp_oid),
	UNIQUE (sp_number)
);

CREATE TABLE TA_BADGE_CHALLENGE (
	fk_badge			integer			not null,
	fk_challenge		integer			not null,
	sp_comment			varchar(300)	default NULL,
	sp_score			integer			not NULL,
	sp_answer			integer			NOT NULL,
	sp_time_done		timestamp		default CURRENT_TIMESTAMP,
	sp_data				blob			default NULL,
	CONSTRAINT PK_OID PRIMARY KEY (fk_badge, fk_challenge)
);

CREATE TABLE TA_LOCATION (
	sp_oid				integer 		NOT NULL AUTO_INCREMENT,
	sp_name				varchar(50)		not NULL,
	sp_comment			varchar(300)	default NULL,	
	sp_coordinates		point			default NULL,
	sp_radius			integer			default NULL,
	CONSTRAINT PK_OID PRIMARY KEY (sp_oid),
	UNIQUE (sp_name)
);	

CREATE TABLE TA_FIRMWARE (
	sp_oid				integer 		NOT NULL AUTO_INCREMENT,
	sp_version			varchar(20)		not NULL,
	sp_comment			varchar(300)	default NULL,	
	sp_changelog		varchar(1000)	not NULL,	
	sp_credits			varchar(200)	default NULL,
	sp_bin				blob			default NULL,
	sp_releasetime		timestamp		not NULL,
	CONSTRAINT PK_OID PRIMARY KEY (sp_oid),
	UNIQUE (sp_version)
);

CREATE TABLE TA_MESSAGE (
	sp_oid				integer 		NOT NULL AUTO_INCREMENT,
	sp_title			varchar(50)		not NULL,
	sp_text				varchar(500)	not NULL,
	sp_create_time		timestamp		default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	sp_author			varchar(20)		not NULL,
	sp_comment			varchar(300)	default NULL,
	CONSTRAINT PK_OID PRIMARY KEY (sp_oid)
);

CREATE TABLE TA_MESSAGE_BADGE (
	fk_badge			integer			not null,
	fk_message			integer			not null,
	sp_time_ack			timestamp		default 0,
	CONSTRAINT PK_OID PRIMARY KEY (fk_badge, fk_message)
);


-- MVs
CREATE TABLE MV_HIGHSCORE AS
select  @currow := @currow + 1 as rank,
		badgeid, 
		nickname,
        image,
        score,
        challenges_played
from (
	select  b.sp_badge_id      as badgeid,
			b.sp_nickname      as nickname,
			b.sp_icon          as image,
			sum(bc.sp_score)   as score,
			count(bc.fk_badge) as challenges_played
	from TA_BADGE_CHALLENGE bc
	inner join TA_BADGE b on bc.fk_badge = b.sp_oid
	group by bc.fk_badge
	order by score desc
) scores
JOIN (SELECT @currow := 0) r
;

create index IN_HIGHSCORE_BADGE_ID ON
MV_HIGHSCORE(badgeid);