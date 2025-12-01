import type { RootScreenProps } from '@/navigation/types';

import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useUser } from '@/hooks';
import { Paths } from '@/navigation/paths';
import { useTheme } from '@/theme';

import { SafeScreen } from '@/components/templates';

type UserListItemProps = {
  readonly avatar?: string;
  readonly bio?: string;
  readonly isBot?: boolean;
  readonly name: string;
  readonly online?: boolean;
  readonly onPress: () => void;
};

function UserList({ navigation }: RootScreenProps<Paths.UserList>) {
  const { t } = useTranslation();
  const { useUsersQuery } = useUser();
  const { fonts, gutters, layout } = useTheme();
  const { data: users, isError, isLoading } = useUsersQuery();

  const handleUserPress = (userId: string) => {
    navigation.navigate(Paths.Chat, { userId });
  };

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={[layout.flex_1, layout.itemsCenter, layout.justifyCenter]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen>
        <View style={[layout.flex_1, layout.itemsCenter, layout.justifyCenter]}>
          <Text style={[fonts.size_16, fonts.red500]}>{t('common_error')}</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[layout.flex_1, gutters.paddingTop_16]}>
        <View style={[gutters.paddingHorizontal_16, gutters.marginBottom_16]}>
          <Text style={[fonts.size_24, fonts.bold, fonts.gray800]}>
            {t('screen_chats.title', 'Select a user to chat')}
          </Text>
        </View>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserListItem
              avatar={item.avatar}
              bio={item.bio}
              isBot={item.isBot}
              name={item.name}
              online={item.online}
              onPress={() => {
                handleUserPress(item.id);
              }}
            />
          )}
        />
      </View>
    </SafeScreen>
  );
}

function UserListItem({
  avatar = undefined,
  bio = undefined,
  isBot = undefined,
  name,
  online = undefined,
  onPress,
}: UserListItemProps) {
  const { backgrounds, borders, colors, fonts, gutters, layout } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        layout.row,
        layout.itemsCenter,
        gutters.paddingHorizontal_16,
        gutters.paddingVertical_12,
        {
          borderBottomColor: colors.gray100,
          borderBottomWidth: 1,
        },
      ]}
    >
      <View style={[layout.relative]}>
        <Image
          source={{ uri: avatar ?? 'https://via.placeholder.com/200' }}
          style={[
            {
              borderRadius: 28,
              height: 56,
              width: 56,
            },
          ]}
        />
        {online ? (
          <View
            style={[
              layout.absolute,
              {
                backgroundColor: '#4CAF50',
                borderColor: colors.gray50,
                borderRadius: 8,
                borderWidth: 2,
                bottom: 0,
                height: 16,
                right: 0,
                width: 16,
              },
            ]}
          />
        ) : undefined}
      </View>
      <View
        style={[layout.flex_1, gutters.marginLeft_16, layout.justifyCenter]}
      >
        <View style={[layout.row, layout.itemsCenter]}>
          <Text
            style={[
              fonts.size_16,
              fonts.bold,
              fonts.gray800,
              gutters.marginRight_12,
            ]}
          >
            {name}
          </Text>
          {isBot ? (
            <Text
              style={[
                fonts.size_12,
                fonts.gray200,
                backgrounds.gray100,
                gutters.paddingHorizontal_12,
                gutters.paddingVertical_12,
                borders.rounded_4,
              ]}
            >
              BOT
            </Text>
          ) : undefined}
        </View>
        {bio ? (
          <Text
            numberOfLines={1}
            style={[fonts.size_12, fonts.gray200, gutters.marginTop_12]}
          >
            {bio}
          </Text>
        ) : undefined}
      </View>
    </TouchableOpacity>
  );
}

export default UserList;
