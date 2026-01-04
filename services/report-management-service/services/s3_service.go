package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3Service struct {
	presign       *s3.PresignClient
	bucket        string
	publicBaseURL string
}

func NewS3ServiceFromEnv() (*S3Service, error) {
	endpoint := getEnvDefault("S3_ENDPOINT", "http://localhost:9001")
	publicBaseURL := getEnvDefault("S3_PUBLIC_BASE_URL", endpoint)
	region := getEnvDefault("S3_REGION", "us-east-1")
	accessKey := getEnvDefault("S3_ACCESS_KEY", "minioadmin")
	secretKey := getEnvDefault("S3_SECRET_KEY", "minioadmin")
	bucket := getEnvDefault("S3_BUCKET", "report-images")

	cfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
			func(service, region string, _ ...interface{}) (aws.Endpoint, error) {
				if service == s3.ServiceID {
					return aws.Endpoint{
						URL:               endpoint,
						SigningRegion:     region,
						HostnameImmutable: true,
					}, nil
				}
				return aws.Endpoint{}, &aws.EndpointNotFoundError{}
			},
		)),
	)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &S3Service{
		presign:       s3.NewPresignClient(client),
		bucket:        bucket,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}, nil
}

func (s *S3Service) GenerateUploadURL(ctx context.Context, userID, fileName, contentType string) (string, string, string, error) {
	safeName := path.Base(fileName)
	ext := strings.ToLower(path.Ext(safeName))
	if ext == "" {
		ext = ".jpg"
	}

	objectKey := fmt.Sprintf("reports/%s/%s%s", userID, uuid.NewString(), ext)
	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}

	presigned, err := s.presign.PresignPutObject(ctx, input, s3.WithPresignExpires(10*time.Minute))
	if err != nil {
		log.Printf("s3-presign: failed bucket=%s object_key=%s content_type=%s err=%v",
			s.bucket,
			objectKey,
			contentType,
			err,
		)
		return "", "", "", err
	}

	imageURL := fmt.Sprintf("%s/%s/%s", s.publicBaseURL, s.bucket, objectKey)
	log.Printf("s3-presign: success bucket=%s object_key=%s", s.bucket, objectKey)
	return presigned.URL, imageURL, objectKey, nil
}

func getEnvDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
