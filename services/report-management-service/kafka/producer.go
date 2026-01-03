package kafka

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"

	"reportmaxxing/services/report-management-service/models"
)

const (
	ReportsCreatedTopic       = "reports.created"
	ReportsStatusChangedTopic = "reports.status-changed"
)

type Producer struct {
	writers map[string]*kafka.Writer
}

func NewProducer(brokerURL string) *Producer {
	p := &Producer{
		writers: make(map[string]*kafka.Writer),
	}

	if err := ensureTopicsExist(brokerURL); err != nil {
		log.Printf("Warning: Failed to ensure topics exist: %v", err)
	}

	for _, topic := range []string{ReportsCreatedTopic, ReportsStatusChangedTopic} {
		p.writers[topic] = &kafka.Writer{
			Addr:         kafka.TCP(brokerURL),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchTimeout: 10 * time.Millisecond,
		}
	}

	return p
}

func ensureTopicsExist(brokerURL string) error {
	conn, err := kafka.Dial("tcp", brokerURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	topicConfigs := []kafka.TopicConfig{
		{
			Topic:             ReportsCreatedTopic,
			NumPartitions:     3,
			ReplicationFactor: 1,
		},
		{
			Topic:             ReportsStatusChangedTopic,
			NumPartitions:     3,
			ReplicationFactor: 1,
		},
	}

	err = conn.CreateTopics(topicConfigs...)
	if err != nil && !isTopicExistsError(err) {
		return err
	}

	log.Printf("Kafka topics ensured: %s, %s", ReportsCreatedTopic, ReportsStatusChangedTopic)
	return nil
}

func isTopicExistsError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "topic already exists") ||
		strings.Contains(errStr, "TopicExistsException") ||
		strings.Contains(errStr, "already exists") ||
		strings.Contains(errStr, "Topic with this name already exists")
}

func (p *Producer) PublishReportCreated(event *models.ReportCreatedEvent) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal ReportCreatedEvent: %v", err)
		return err
	}

	msg := kafka.Message{
		Key:   []byte(event.ReportID),
		Value: data,
		Time:  time.Now(),
	}

	if err := p.writers[ReportsCreatedTopic].WriteMessages(ctx, msg); err != nil {
		log.Printf("Failed to publish to %s: %v", ReportsCreatedTopic, err)
		return err
	}

	log.Printf("Published ReportCreatedEvent for report: %s", event.ReportID)
	return nil
}

func (p *Producer) PublishReportStatusChanged(event *models.ReportStatusChangedEvent) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal ReportStatusChangedEvent: %v", err)
		return err
	}

	msg := kafka.Message{
		Key:   []byte(event.ReportID),
		Value: data,
		Time:  time.Now(),
	}

	if err := p.writers[ReportsStatusChangedTopic].WriteMessages(ctx, msg); err != nil {
		log.Printf("Failed to publish to %s: %v", ReportsStatusChangedTopic, err)
		return err
	}

	log.Printf("Published ReportStatusChangedEvent for report: %s", event.ReportID)
	return nil
}

func (p *Producer) Close() error {
	for _, writer := range p.writers {
		if err := writer.Close(); err != nil {
			log.Printf("Error closing Kafka writer: %v", err)
		}
	}
	return nil
}
