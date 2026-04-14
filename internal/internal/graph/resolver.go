//go:generate sh ../scripts/genSchema.sh
//go:generate go run github.com/99designs/gqlgen

package graph

import (
	"context"
	"encoding/json"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/jordanknott/taskcafe/internal/config"
	"github.com/jordanknott/taskcafe/internal/db"
	"github.com/jordanknott/taskcafe/internal/jobs"
	"github.com/jordanknott/taskcafe/internal/utils"
	log "github.com/sirupsen/logrus"
)

// Resolver handles resolving GraphQL queries & mutations
type Resolver struct {
	Repository    db.Repository
	AppConfig     config.AppConfig
	Notifications *NotificationObservers
	Job           jobs.JobQueue
	Redis         *redis.Client
}

func (r Resolver) SubscribeRedis() {
	ctx := context.Background()
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				log.WithField("panic", rec).Error("panic in Redis subscription goroutine; restarting")
				r.SubscribeRedis()
			}
		}()
		subscriber := r.Redis.Subscribe(ctx, "notification-created")
		log.Info("Stream starting...")
		for {
			msg, err := subscriber.ReceiveMessage(ctx)
			if err != nil {
				log.WithError(err).Error("while receiving message")
				return
			}
			var message utils.NotificationCreatedMessage

			if err := json.Unmarshal([]byte(msg.Payload), &message); err != nil {
				log.WithError(err).Error("while unmarshalling notification created message; skipping")
				continue
			}
			log.WithField("notID", message.NotifiedID).Info("received notification message")

			notified, err := r.Repository.GetNotifiedByIDNoExtra(ctx, uuid.MustParse(message.NotifiedID))
			if err != nil {
				log.WithError(err).Error("while getting notified by id; skipping")
				continue
			}
			notification, err := r.Repository.GetNotificationByID(ctx, uuid.MustParse(message.NotificationID))
			if err != nil {
				log.WithError(err).Error("while getting notification by id; skipping")
				continue
			}
			for _, observers := range r.Notifications.Subscribers {
				for _, ochan := range observers {
					ochan <- &Notified{
						ID:           notified.NotifiedID,
						Read:         notified.Read,
						ReadAt:       &notified.ReadAt.Time,
						Notification: &notification,
					}
				}
			}
		}
	}()
}
