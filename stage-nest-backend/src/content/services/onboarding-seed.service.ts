import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ContentCategoryOnboardingMappingRepository } from '../repositories/contentCategoryOnboardingMapping.repository';
import { ContentOnboardingCategoryRepository } from '../repositories/contentOnboardingCategory.repository';
import { contentCategoryOnboardingMappingSeedData } from '../seeders/contentCategoryOnboardingMapping.seed';
import { contentOnboardingCategorySeedData } from '../seeders/contentOnboardingCategory.seed';

@Injectable()
export class OnboardingSeedService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingSeedService.name);

  constructor(
    private readonly categoryRepository: ContentOnboardingCategoryRepository,
    private readonly mappingRepository: ContentCategoryOnboardingMappingRepository,
  ) {}

  private async seedOnboardingData() {
    // Check if data already exists
    const existingCategories = await this.categoryRepository.find({});
    const existingMappings = await this.mappingRepository.find({});

    if (existingCategories && existingCategories.length > 0) {
      this.logger.log(
        `Found ${existingCategories.length} existing categories, skipping category seeding`,
      );
    } else {
      // Seed categories
      this.logger.log('📂 Seeding onboarding categories...');
      for (const categoryData of contentOnboardingCategorySeedData) {
        try {
          await this.categoryRepository.create(categoryData);
          const categoryName =
            categoryData.categoryName?.en || `Category ${categoryData._id}`;
          this.logger.log(`✓ Created category: ${categoryName}`);
        } catch (error) {
          const categoryName =
            categoryData.categoryName?.en || `Category ${categoryData._id}`;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `⚠️ Category ${categoryName} might already exist:`,
            errorMessage,
          );
        }
      }
      this.logger.log(
        `✅ Seeded ${contentOnboardingCategorySeedData.length} categories`,
      );
    }

    if (existingMappings && existingMappings.length > 0) {
      this.logger.log(
        `Found ${existingMappings.length} existing mappings, skipping mapping seeding`,
      );
    } else {
      // Seed content mappings
      this.logger.log('🔗 Seeding content category mappings...');
      for (const mappingData of contentCategoryOnboardingMappingSeedData) {
        try {
          await this.mappingRepository.create(mappingData);
          this.logger.log(
            `✓ Created mapping: ${mappingData.contentSlug} → Categories [${mappingData.categoryIds.join(', ')}]`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `⚠️ Mapping for ${mappingData.contentSlug} might already exist:`,
            errorMessage,
          );
        }
      }
      this.logger.log(
        `✅ Seeded ${contentCategoryOnboardingMappingSeedData.length} content mappings`,
      );
    }

    // Print summary
    const totalCategories = await this.categoryRepository.find({});
    const totalMappings = await this.mappingRepository.find({});

    this.logger.log('📊 Seeding Summary:');
    this.logger.log(`📂 Total Categories: ${totalCategories?.length || 0}`);
    this.logger.log(`🔗 Total Mappings: ${totalMappings?.length || 0}`);

    // Show categories breakdown
    if (totalCategories && totalCategories.length > 0) {
      this.logger.log('📋 Categories:');
      for (const category of totalCategories) {
        const mappingCount =
          totalMappings?.filter((m) => m.categoryIds.includes(category._id))
            .length || 0;
        this.logger.log(
          `  ${category._id}. ${category.categoryName.en} (${mappingCount} items)`,
        );
      }
    }
  }

  async onModuleInit() {
    // Only run seeds in development environment
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Skipping seed data in production environment');
      return;
    }

    try {
      this.logger.log('🌱 Starting onboarding data seeding...');
      await this.seedOnboardingData();
      this.logger.log('✅ Onboarding data seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Error during onboarding data seeding:', error);
    }
  }
}
