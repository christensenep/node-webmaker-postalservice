var AWS = require("aws-sdk"),
    nunjucks = require("nunjucks"),
    nunjucksEnv = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(__dirname + "/templates/"),
      { autoescape: true }
    ),
    premailer = require('premailer-api'),
    i18n = require('webmaker-i18n'),
    path = require('path');

// Setup locales with i18n
i18n.middleware({
  supported_languages: ['*'],
  default_lang: "en-US",
  translation_directory: path.resolve(__dirname, "locale")
});

nunjucksEnv.addFilter("instantiate", function (input) {
  var tmpl = new nunjucks.Template(input);
  return tmpl.render(this.getVariables());
});

function isLanguageSupport(locale) {
  return i18n.getSupportLanguages().indexOf(locale) !== -1;
};

module.exports = function(options) {
  if (!options.key) {
    throw 'aws "key" required';
  }
  if (!options.secret) {
    throw 'aws "secret" required';
  }

  var webmakerURL = options.webmakerURL || 'https://webmaker.org';

  var ses = new AWS.SES({
    accessKeyId: options.key,
    secretAccessKey: options.secret
  });

  var templates = {
    createEventEmail: nunjucksEnv.getTemplate("create_event.html"),
    mofoStaffEmail: nunjucksEnv.getTemplate("mofo_staff_new_event.html"),
    welcomeEmail: nunjucksEnv.getTemplate("welcome.html"),
    badgeAwarded: nunjucksEnv.getTemplate("badge_awarded.html"),
    badgeAwardedSuperMentor: nunjucksEnv.getTemplate("badge_awarded_super_mentor.html"),
    eventHostBadgeAwarded: nunjucksEnv.getTemplate("event_host_badge_awarded.html"),
    skillSharerBadgeAwarded: nunjucksEnv.getTemplate("skill_sharer_badge_awarded.html"),
    teachingKitBadgeAwarded: nunjucksEnv.getTemplate("teaching_kit_badge_awarded.html")
  };

  return {
    sendCreateEventEmail: function(options, callback) {
      options.locale = isLanguageSupport(options.locale) ? options.locale : "en-US";
      var html = templates.createEventEmail.render({
        fullName: options.fullName,
        gettext: i18n.getStrings(options.locale),
        locale: options.locale
      });

      premailer.prepare({
        html: html
      }, function(err, email) {
        if (err) {
          return callback(err);
        }

        ses.sendEmail({
          Source: "Webmaker <events@webmaker.org>",
          Destination: {
            ToAddresses: [options.to],
          },
          Message: {
            Subject: {
              Data: i18n.gettext("Next steps for your event", options.locale),
              Charset: "utf8"
            },
            Body: {
              Text: {
                Data: email.text,
                Charset: "utf8"
              },
              Html: {
                Data: email.html,
                Charset: "utf8"
              }
            }
          }
        }, callback);
      });
    },
    sendBadgeAwardedEmail: function(options, callback) {
      options.locale = isLanguageSupport(options.locale) ? options.locale : "en-US";

      // Use the right template
      var template;
      var subject;
      var from;

      switch (options.badge.slug) {
        case 'webmaker-super-mentor':
          template = 'badgeAwardedSuperMentor';
          subject = 'badgeAwardedSuperMentorSubject';
          from = 'Michelle Thorne <help@webmaker.org>';
          break;

        case 'skill-sharer':
          template = 'skillSharerBadgeAwarded';
          subject = 'badgeAwardedSubject';
          from = 'Webmaker <help@webmaker.org>';
          break;

        case 'event-host':
          template = 'eventHostBadgeAwarded';
          subject = 'badgeAwardedSubject';
          from = 'Webmaker <help@webmaker.org>';
          break;

        case 'teaching-kit-remixer':
          template = 'teachingKitBadgeAwarded';
          subject = 'badgeAwardedSubject';
          from = 'Webmaker <help@webmaker.org>';
          break;

        default:
          template = 'badgeAwarded';
          subject = 'badgeAwardedSubject';
          from = 'Webmaker <help@webmaker.org>';
          break;
      }

      var html = templates[template].render({
        email: options.to,
        username: options.user && options.user.username,
        badge: options.badge,
        comment: options.comment,
        gettext: i18n.getStrings(options.locale),
        locale: options.locale,
        webmakerURL: webmakerURL
      });

      premailer.prepare({
        html: html
      }, function(err, email) {
        if (err) {
          return callback(err);
        }

        ses.sendEmail({
          Source: from,
          Destination: {
            ToAddresses: [options.to]
          },
          Message: {
            Subject: {
              Data: i18n.gettext(subject, options.locale),
              Charset: "utf8"
            },
            Body: {
              Text: {
                Data: email.text,
                Charset: "utf8"
              },
              Html: {
                Data: email.html,
                Charset: "utf8"
              }
            }
          }
        }, callback);
      });
    },
    sendWelcomeEmail: function(options, callback) {
      options.locale = isLanguageSupport(options.locale) ? options.locale : "en-US";
      var html = templates.welcomeEmail.render({
        fullName: options.fullName,
        gettext: i18n.getStrings(options.locale),
        locale: options.locale
      });

      premailer.prepare({
        html: html
      }, function(err, email) {
        if (err) {
          return callback(err);
        }

        ses.sendEmail({
          Source: "Webmaker <help@webmaker.org>",
          Destination: {
            ToAddresses: [options.to]
          },
          Message: {
            Subject: {
              Data: i18n.gettext("emailTitle", options.locale),
              Charset: "utf8"
            },
            Body: {
              Text: {
                Data: email.text,
                Charset: "utf8"
              },
              Html: {
                Data: email.html,
                Charset: "utf8"
              }
            }
          }
        }, callback);
      });
    },
    sendMofoStaffEmail: function(options, callback) {
      var html = templates.mofoStaffEmail.render({
        email: options.email,
        username: options.username,
        eventId: options.eventId
      });

      premailer.prepare({
        html: html
      }, function(err, email) {
        if (err) {
          return callback(err);
        }

        ses.sendEmail({
          Source: "Webmaker <help@webmaker.org>",
          Destination: {
            ToAddresses: [options.to]
          },
          Message: {
            Subject: {
              Data: "A new event was created",
              Charset: "utf8"
            },
            Body: {
              Text: {
                Data: email.text,
                Charset: "utf8"
              },
              Html: {
                Data: email.html,
                Charset: "utf8"
              }
            }
          }
        }, callback);
      });
    }
  };
};
